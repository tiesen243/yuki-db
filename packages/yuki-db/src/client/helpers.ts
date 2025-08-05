import type {
  ActionType,
  ExtractInsert,
  ExtractSelect,
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  WhereClause,
} from '../types'

export const createDatabaseQueryOptions = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(options: {
  select: TSelect
  from: TFrom
  where?: WhereClause<ExtractSelect<TFrom>>
  order?: OrderClause<TFrom, keyof TSelect>
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
  if (options.order) searchParams.set('order', JSON.stringify(options.order))
  if (options.limit) searchParams.set('limit', String(options.limit))
  if (options.offset) searchParams.set('offset', String(options.offset))

  const dependencies: string[] = [
    String(options.from),
    ...selectedColumns.map(String),
    ...(options.where ? [JSON.stringify(options.where)] : []),
    ...(options.order ? [JSON.stringify(options.order)] : []),
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
      if (!response.ok)
        throw new Error(
          `Failed to fetch data from database: ${response.statusText}`,
        )
      const json = (await response.json()) as TData[]
      return json.map((item) => {
        const newItem: Record<string, unknown> = {}
        for (const key in item) {
          const stringValue = String(item[key] ?? '')
          if (!isNaN(Date.parse(stringValue)))
            newItem[key] = new Date(stringValue)
          else if (!isNaN(Number(stringValue)) && stringValue.trim() !== '')
            newItem[key] = Number(stringValue)
          else newItem[key] = stringValue
        }
        return newItem as TData
      })
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
  mutationFn: <TValues extends ExtractInsert<TTable>>(
    data: TAction extends 'insert'
      ? TValues
      : TAction extends 'update'
        ? {
            where: WhereClause<ExtractSelect<TTable>>
            data: TValues
          }
        : WhereClause<ExtractSelect<TTable>>,
  ) => Promise<void>
} => {
  const mutationKey = ['db', options.action, String(options.table)]

  return {
    mutationKey,
    mutationFn: async <TValues extends ExtractInsert<TTable>>(
      data: TAction extends 'insert'
        ? TValues
        : TAction extends 'update'
          ? {
              where: WhereClause<ExtractSelect<TTable>>
              data: TValues
            }
          : WhereClause<ExtractSelect<TTable>>,
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
      if (!response.ok)
        throw new Error(
          `Failed to perform database action: ${response.statusText}`,
        )
    },
  }
}
