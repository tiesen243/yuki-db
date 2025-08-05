import type {
  Database,
  OrderClause,
  SelectableColumns,
  SelectedData,
  WhereClause,
} from '../types'

export const createDatabaseQueryOptions = <
  // @ts-expect-error - schema will be registered by the user
  TFrom extends keyof Database['schema'],
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(options: {
  select: TSelect
  from: TFrom
  // @ts-expect-error - schema will be registered by the user
  where?: WhereClause<Database['schema'][TFrom]['$inferSelect']>
  order?: OrderClause<TSelect>
  limit?: number
  offset?: number
}): {
  queryKey: string[]
  queryFn: () => Promise<TData[]>
} => {
  const searchParams = new URLSearchParams()
  searchParams.set('select', options.select.join(','))
  searchParams.set('from', String(options.from))
  if (options.where) searchParams.set('where', JSON.stringify(options.where))
  if (options.order) searchParams.set('order', JSON.stringify(options.order))
  if (options.limit) searchParams.set('limit', String(options.limit))
  if (options.offset) searchParams.set('offset', String(options.offset))

  const dependencies: string[] = [
    String(options.from),
    ...options.select.map(String),
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
