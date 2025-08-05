import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery } from '@tanstack/react-query'

import type {
  ActionType,
  Database,
  OrderClause,
  SelectableColumns,
  SelectedData,
} from '../types'
import { createDatabaseQueryOptions } from './helpers'

export const useDatabaseQuery = <
  // @ts-expect-error - schema will be registered by the user
  TFrom extends keyof Database['schema'],
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(
  options:
    | {
        select: TSelect
        from: TFrom
        // @ts-expect-error - schema will be registered by the user
        where?: WhereClause<Database['schema'][TFrom]['$inferSelect']>
        order?: OrderClause<TSelect>
      }
    | ReturnType<typeof createDatabaseQueryOptions<TFrom, TSelect, TData>>,
): UseQueryResult<TData[]> => {
  if (typeof options === 'object' && 'select' in options && 'from' in options)
    options = createDatabaseQueryOptions(options)
  return useQuery<TData[]>(options)
}

export const useDatabaseMutation = <
  TAction extends ActionType,
  // @ts-expect-error - schema will be registered by the user
  TTable extends keyof Database['schema'],
  // @ts-expect-error - schema will be registered by the user
  TValues extends Database['schema'][TTable]['$inferInsert'],
>(options: {
  action: TAction
  table: TTable
  onSuccess?: () => void | Promise<void>
  onError?: (error: Error) => void | Promise<void>
}): UseMutationResult<
  void,
  Error,
  TAction extends 'insert'
    ? TValues
    : TAction extends 'update'
      ? {
          // @ts-expect-error - schema will be registered by the user
          where: WhereClause<Database['schema'][TTable]['$inferSelect']>
          data: TValues
        }
      : // @ts-expect-error - schema will be registered by the user
        WhereClause<Database['schema'][TTable]['$inferSelect']>
> =>
  useMutation({
    mutationKey: ['db', options.action, options.table],
    mutationFn: async (
      data: TAction extends 'insert'
        ? TValues
        : TAction extends 'update'
          ? {
              // @ts-expect-error - schema will be registered by the user
              where: WhereClause<Database['schema'][TTable]['$inferSelect']>
              data: TValues
            }
          : // @ts-expect-error - schema will be registered by the user
            WhereClause<Database['schema'][TTable]['$inferSelect']>,
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
    onSuccess: options.onSuccess,
    onError: options.onError,
  })
