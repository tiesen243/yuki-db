import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  UseSuspenseQueryOptions,
  UseSuspenseQueryResult,
} from '@tanstack/react-query'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

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
import {
  createDatabaseMutationOptions,
  createDatabaseQueryOptions,
} from './helpers'

export const useDatabaseQuery = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(
  options:
    | {
        select: TSelect
        from: TFrom
        where?: WhereClause<ExtractSelect<TFrom>>
        order?: OrderClause<TFrom>
        limit?: number
        offset?: number
      }
    | ReturnType<typeof createDatabaseQueryOptions<TFrom, TSelect, TData>>,
  queryOptions?: Omit<UseQueryOptions<TData[]>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData[]> => {
  if (typeof options === 'object' && 'select' in options && 'from' in options)
    options = createDatabaseQueryOptions(options)

  return useQuery<TData[]>({
    ...options,
    ...queryOptions,
  })
}

export const useDatabaseSuspenseQuery = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(
  options:
    | {
        select: TSelect
        from: TFrom
        where?: WhereClause<ExtractSelect<TFrom>>
        order?: OrderClause<TFrom>
        limit?: number
        offset?: number
      }
    | ReturnType<typeof createDatabaseQueryOptions<TFrom, TSelect, TData>>,
  queryOptions?: Omit<UseSuspenseQueryOptions<TData[]>, 'queryKey' | 'queryFn'>,
): UseSuspenseQueryResult<TData[]> => {
  if (typeof options === 'object' && 'select' in options && 'from' in options)
    options = createDatabaseQueryOptions(options)

  return useSuspenseQuery<TData[]>({
    ...options,
    ...queryOptions,
  })
}

export const useDatabaseMutation = <
  TAction extends ActionType,
  TTable extends keyof ExtractTables,
  TValues extends ExtractInsert<TTable>,
>(
  options:
    | {
        action: TAction
        table: TTable
      }
    | ReturnType<typeof createDatabaseMutationOptions<TAction, TTable>>,
  mutationOptions?: Omit<
    UseMutationOptions<
      void,
      Error,
      TAction extends 'insert'
        ? TValues
        : TAction extends 'update'
          ? {
              where: WhereClause<ExtractSelect<TTable>>
              data: TValues
            }
          : WhereClause<ExtractSelect<TTable>>
    >,
    'mutationKey' | 'mutationFn'
  >,
): UseMutationResult<
  void,
  Error,
  TAction extends 'insert'
    ? TValues
    : TAction extends 'update'
      ? {
          where: WhereClause<ExtractSelect<TTable>>
          data: TValues
        }
      : WhereClause<ExtractSelect<TTable>>
> => {
  if (typeof options === 'object' && 'action' in options && 'table' in options)
    options = createDatabaseMutationOptions(options)

  return useMutation({
    ...options,
    ...mutationOptions,
  })
}
