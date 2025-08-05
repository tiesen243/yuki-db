import type {
  ActionType,
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  UpdateWhereClause,
  WhereClause,
} from '../types'

export const createDatabaseQueryOptions = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(options: {
  select: TSelect
  from: TFrom
  where?: WhereClause<ExtractTables[TFrom]['$inferSelect']>
  orderBy?: OrderClause<TFrom>
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
