import type {
  ActionType,
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  UpdateWhereClause,
  WhereClause,
} from '../types'

/**
 * Creates query options for database read operations compatible with query libraries like React Query
 * @template TFrom - The table name type from the database schema
 * @template TSelect - The selectable columns type for the specified table
 * @template TData - The resulting data type after selection
 * @param {Object} options - Query configuration options
 * @param {TSelect} options.select - Object specifying which columns to select (true/false for each column)
 * @param {TFrom} options.from - The table name to query from
 * @param {WhereClause<ExtractTables[TFrom]['$inferSelect']>} [options.where] - Optional WHERE conditions
 * @param {OrderClause<TFrom>} [options.orderBy] - Optional ORDER BY clause
 * @param {number} [options.limit] - Optional limit for number of results
 * @param {number} [options.offset] - Optional offset for pagination
 * @returns {Object} Object containing queryKey and queryFn for use with query libraries
 * @returns {string[]} returns.queryKey - Unique key array for caching the query
 * @returns {() => Promise<TData[]>} returns.queryFn - Async function that executes the database query
 *
 * @example
 * const userQuery = createDatabaseQueryOptions({
 *   select: { id: true, name: true, email: false },
 *   from: 'users',
 *   where: { age: { gt: 18 } },
 *   orderBy: { name: 'asc' },
 *   limit: 10
 * })
 */
export const createDatabaseQueryOptions = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(options: {
  select: TSelect
  from: TFrom
  where?: WhereClause<ExtractTables[TFrom]['$inferSelect']>
  orderBy?: OrderClause<TFrom, keyof TSelect>
  limit?: number
  offset?: number
}): {
  queryKey: string[]
  queryFn: () => Promise<TData[]>
} => {
  const selectedColumns = Object.entries(options.select)
    .filter(([, value]) => value)
    .map(([key]) => key)

  const searchParams = new URLSearchParams()
  searchParams.set('select', selectedColumns.join(','))
  searchParams.set('from', String(options.from))
  if (options.where) searchParams.set('where', JSON.stringify(options.where))
  if (options.orderBy)
    searchParams.set('orderBy', JSON.stringify(options.orderBy))
  if (options.limit) searchParams.set('limit', String(options.limit))
  if (options.offset) searchParams.set('offset', String(options.offset))

  const dependencies: string[] = [
    String(options.from),
    ...selectedColumns.map(String),
    ...(options.where ? [JSON.stringify(options.where)] : []),
    ...(options.orderBy ? [JSON.stringify(options.orderBy)] : []),
    ...(options.limit ? [String(options.limit)] : []),
    ...(options.offset ? [String(options.offset)] : []),
  ]

  return {
    queryKey: ['db', ...dependencies],
    queryFn: async () => {
      const response = await fetch(`/api/db?${searchParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        if (process.env.NODE_ENV === 'development')
          console.error(
            'Failed to fetch data from database:',
            await response.text(),
          )
        throw new Error(
          `Failed to fetch data from database: ${response.statusText}`,
        )
      }
      const json = (await response.json()) as Record<string, string>[]
      return json.map((item) => parseJson(item)) as TData[]
    },
  }
}

/**
 * Creates mutation options for database write operations (insert, update, delete)
 * @template TAction - The action type ('insert' | 'update' | 'delete')
 * @template TTable - The table name type from the database schema
 * @param {Object} options - Mutation configuration options
 * @param {TAction} options.action - The type of database action to perform
 * @param {TTable} options.table - The table name to perform the action on
 * @returns {Object} Object containing mutationKey and mutationFn for use with mutation libraries
 * @returns {string[]} returns.mutationKey - Unique key array for the mutation
 * @returns {Function} returns.mutationFn - Function that executes the database mutation
 *
 * @example
 * // Insert mutation
 * const insertUser = createDatabaseMutationOptions({
 *   action: 'insert',
 *   table: 'users'
 * })
 * await insertUser.mutate({ name: 'John', email: 'john@example.com' })
 *
 * @example
 * // Update mutation
 * const updateUser = createDatabaseMutationOptions({
 *   action: 'update',
 *   table: 'users'
 * })
 * await updateUser.mutate({
 *   where: { id: 1 },
 *   data: { name: 'Jane' }
 * })
 *
 * @example
 * // Delete mutation
 * const deleteUser = createDatabaseMutationOptions({
 *   action: 'delete',
 *   table: 'users'
 * })
 * await deleteUser.mutate({ id: 1 })
 */
export const createDatabaseMutationOptions = <
  TAction extends ActionType,
  TTable extends keyof ExtractTables,
>(options: {
  action: TAction
  table: TTable
}): {
  mutationKey: string[]
  mutationFn: <TValues extends ExtractTables[TTable]['$inferInsert']>(
    data: TAction extends 'insert'
      ? TValues
      : TAction extends 'update'
        ? { where: UpdateWhereClause<TTable>; data: Partial<TValues> }
        : UpdateWhereClause<TTable>,
  ) => Promise<void>
} => {
  const mutationKey = ['db', options.action, String(options.table)]

  return {
    mutationKey,
    mutationFn: async <TValues extends ExtractTables[TTable]['$inferInsert']>(
      data: TAction extends 'insert'
        ? TValues
        : TAction extends 'update'
          ? { where: UpdateWhereClause<TTable>; data: Partial<TValues> }
          : UpdateWhereClause<TTable>,
    ) => {
      const searchParams = new URLSearchParams()
      searchParams.set('action', options.action)
      searchParams.set('table', String(options.table))

      if (options.action === 'update')
        searchParams.set('where', JSON.stringify(data.where))
      else if (options.action === 'delete')
        searchParams.set('where', JSON.stringify(data))

      const response = await fetch(`/api/db?${searchParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:
          options.action === 'insert'
            ? JSON.stringify(data)
            : options.action === 'update'
              ? JSON.stringify(data.data)
              : JSON.stringify({}),
      })
      if (!response.ok) {
        if (process.env.NODE_ENV === 'development')
          console.error(
            `Failed to perform database action: ${await response.text()}`,
          )
        throw new Error(
          `Failed to perform database action: ${response.statusText}`,
        )
      }
    },
  }
}

/**
 * Parses a record of string values into their appropriate JavaScript types
 * @param {Record<string, string>} data - Object with string values to be parsed
 * @returns {Record<string, unknown>} Object with values converted to appropriate types
 *
 * @description
 * Converts string values to:
 * - Boolean: 'true' → true, 'false' → false
 * - Number: Valid numeric strings → Number
 * - Date: ISO-like date strings (YYYY-MM-DD format) → Date objects
 * - String: Everything else remains as string
 *
 * @example
 * parseJson({
 *   id: '123',
 *   active: 'true',
 *   createdAt: '2023-01-01T00:00:00Z',
 *   name: 'John'
 * })
 * // Returns: { id: 123, active: true, createdAt: Date, name: 'John' }
 */
function parseJson(data: Record<string, string>): Record<string, unknown> {
  const isDate = (value: string) => {
    const date = new Date(value)
    return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value) // ISO-like format
  }

  const parsed: Record<string, unknown> = {}

  for (const key in data) {
    const value = data[key]

    if (typeof value !== 'string') {
      parsed[key] = value
      continue
    }

    if (value === 'true') parsed[key] = true
    else if (value === 'false') parsed[key] = false
    else if (!isNaN(Number(value))) parsed[key] = Number(value)
    else if (isDate(value)) parsed[key] = new Date(value)
    else parsed[key] = value
  }

  return parsed
}
