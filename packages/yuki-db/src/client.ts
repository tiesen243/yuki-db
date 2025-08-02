import { useMutation, useQuery } from '@tanstack/react-query'

import type { ActionType, Database } from './types'

export const useDatabaseQuery = <
  // @ts-expect-error - schema will be registered by the user
  TFrom extends keyof Database['schema'],
  // @ts-expect-error - schema will be registered by the user
  TSelect extends (keyof Database['schema'][TFrom]['$inferSelect'])[],
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  TData = {
    // @ts-expect-error - schema will be registered by the user
    [K in TSelect[number]]: Database['schema'][TFrom]['$inferSelect'][K]
  },
>(
  options: {
    select: TSelect
    from: TFrom
  },
  deps?: string[],
): {
  data?: TData[]
  error: Error | null
  isLoading: boolean
  refetch: () => unknown
} => {
  const searchParams = new URLSearchParams()
  searchParams.set('select', options.select.join(','))
  searchParams.set('from', String(options.from))
  const dependencies = [options.from, ...options.select, ...(deps ?? [])]

  return useQuery<TData[]>({
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
  })
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
