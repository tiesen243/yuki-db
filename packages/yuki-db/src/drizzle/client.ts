import { useMutation, useQuery } from '@tanstack/react-query'

import type { ActionType, Database } from '../types'

type WhereOperator = 'eq' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'

type FieldCondition<T> = Partial<Record<WhereOperator, T>>

type WhereClause<TSchema> = {
  [K in keyof TSchema]?: FieldCondition<TSchema[K]>
} & {
  OR?: WhereClause<TSchema>[]
  AND?: WhereClause<TSchema>
  NOT?: WhereClause<TSchema>
}

export const createDatabaseQueryOptions = <
  // @ts-expect-error - schema will be registered by the user
  TFrom extends keyof Database['schema'],
  // @ts-expect-error - schema will be registered by the user
  TSelect extends (keyof Database['schema'][TFrom]['$inferSelect'])[],
  TData = {
    // @ts-expect-error - schema will be registered by the user
    [K in TSelect[number]]: Database['schema'][TFrom]['$inferSelect'][K]
  },
>(options: {
  select: TSelect
  from: TFrom
  // @ts-expect-error - schema will be registered by the user
  where?: WhereClause<Database['schema'][TFrom]['$inferSelect']>
  order?: Partial<Record<TSelect[number], 'asc' | 'desc'>>
}): {
  queryKey: string[]
  queryFn: () => Promise<TData[]>
} => {
  const searchParams = new URLSearchParams()
  searchParams.set('select', options.select.join(','))
  searchParams.set('from', String(options.from))
  if (options.where) searchParams.set('where', JSON.stringify(options.where))
  if (options.order) searchParams.set('order', JSON.stringify(options.order))
  const dependencies: string[] = [
    String(options.from),
    ...options.select.map(String),
    ...(options.where ? [JSON.stringify(options.where)] : []),
    ...(options.order ? [JSON.stringify(options.order)] : []),
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

export const useDatabaseQuery = <
  // @ts-expect-error - schema will be registered by the user
  TFrom extends keyof Database['schema'],
  // @ts-expect-error - schema will be registered by the user
  TSelect extends (keyof Database['schema'][TFrom]['$inferSelect'])[],
  TData = {
    // @ts-expect-error - schema will be registered by the user
    [K in TSelect[number]]: Database['schema'][TFrom]['$inferSelect'][K]
  },
>(
  options:
    | {
        select: TSelect
        from: TFrom
        // @ts-expect-error - schema will be registered by the user
        where?: WhereClause<Database['schema'][TFrom]['$inferSelect']>
        order?: Partial<Record<TSelect[number], 'asc' | 'desc'>>
      }
    | ReturnType<typeof createDatabaseQueryOptions<TFrom, TSelect, TData>>,
): {
  data?: TData[]
  error: Error | null
  isLoading: boolean
} => {
  if (typeof options === 'object' && 'select' in options && 'from' in options)
    options = createDatabaseQueryOptions(options)

  return useQuery<TData[]>(options)
}

export const useDatabaseMutation = <
  TAction extends ActionType,
  // @ts-expect-error - schema will be registered by the user
  TTable extends keyof Database['schema'],
  // @ts-expect-error - schema will be registered by the user
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  TValues extends Database['schema'][TTable]['$inferInsert'],
>(
  options: {
    action: TAction
    table: TTable
    onSuccess?: () => void | Promise<void>
    onError?: (error: Error) => void | Promise<void>
  } & (TAction extends 'insert' ? object : { id: string }),
): {
  mutate: (values: TValues) => void | Promise<void>
  error: Error | null
  isPending: boolean
} => {
  return useMutation({
    mutationKey: ['db', options.action, options.table],
    mutationFn: async (values: TValues) => {
      const searchParams = new URLSearchParams()
      searchParams.set('action', options.action)
      searchParams.set('table', String(options.table))
      if (options.action !== 'insert') {
        // @ts-expect-error - id is required for non-insert actions
        searchParams.set('id', String(options.id))
      }

      const response = await fetch(`/api/db?${searchParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!response.ok)
        throw new Error(
          `Failed to perform database action: ${response.statusText}`,
        )
    },
    onSuccess: options.onSuccess,
    onError: options.onError,
  })
}
