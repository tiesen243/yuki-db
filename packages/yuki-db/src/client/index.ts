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
  ExtractTables,
  OrderClause,
  SelectableColumns,
  SelectedData,
  UpdateWhereClause,
  WhereClause,
} from '../types'
import {
  createDatabaseMutationOptions,
  createDatabaseQueryOptions,
} from './helpers'

/**
 * React hook for querying database records with type safety
 * @template TFrom - The table name type from the database schema
 * @template TSelect - The selectable columns type for the specified table
 * @template TData - The resulting data type after selection (defaults to inferred type)
 * @param {Object|ReturnType<typeof createDatabaseQueryOptions>} options - Query configuration or pre-built query options
 * @param {TSelect} options.select - Object specifying which columns to select (true/false for each column)
 * @param {TFrom} options.from - The table name to query from
 * @param {WhereClause<ExtractTables[TFrom]['$inferSelect']>} [options.where] - Optional WHERE conditions
 * @param {OrderClause<TFrom>} [options.orderBy] - Optional ORDER BY clause
 * @param {number} [options.limit] - Optional limit for number of results
 * @param {number} [options.offset] - Optional offset for pagination
 * @param {Omit<UseQueryOptions<TData[]>, 'queryKey' | 'queryFn'>} [queryOptions] - Additional React Query options
 * @returns {UseQueryResult<TData[]>} React Query result object with data, loading state, and error handling
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useDatabaseQuery({
 *   select: { id: true, name: true, email: true },
 *   from: 'users',
 *   where: { active: { eq: true } },
 *   orderBy: { createdAt: 'desc' },
 *   limit: 20
 * })
 *
 * @example
 * // With additional query options
 * const { data } = useDatabaseQuery(
 *   { select: { id: true, name: true }, from: 'users' },
 *   { refetchInterval: 5000, enabled: someCondition }
 * )
 */
export const useDatabaseQuery = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(
  options:
    | {
        select: TSelect
        from: TFrom
        where?: WhereClause<ExtractTables[TFrom]['$inferSelect']>
        orderBy?: OrderClause<TFrom, keyof TSelect>
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

/**
 * React Suspense hook for querying database records with type safety
 * @template TFrom - The table name type from the database schema
 * @template TSelect - The selectable columns type for the specified table
 * @template TData - The resulting data type after selection (defaults to inferred type)
 * @param {Object|ReturnType<typeof createDatabaseQueryOptions>} options - Query configuration or pre-built query options
 * @param {TSelect} options.select - Object specifying which columns to select (true/false for each column)
 * @param {TFrom} options.from - The table name to query from
 * @param {WhereClause<ExtractTables[TFrom]['$inferSelect']>} [options.where] - Optional WHERE conditions
 * @param {OrderClause<TFrom>} [options.orderBy] - Optional ORDER BY clause
 * @param {number} [options.limit] - Optional limit for number of results
 * @param {number} [options.offset] - Optional offset for pagination
 * @param {Omit<UseSuspenseQueryOptions<TData[]>, 'queryKey' | 'queryFn'>} [queryOptions] - Additional React Query suspense options
 * @returns {UseSuspenseQueryResult<TData[]>} React Query suspense result object with guaranteed data (no loading state)
 *
 * @description
 * This hook uses React Suspense, which means:
 * - The component will suspend (show fallback) while loading
 * - Data is guaranteed to be available when the component renders
 * - No need to handle loading states manually
 *
 * @example
 * // Component using Suspense
 * function UserList() {
 *   const { data } = useDatabaseSuspenseQuery({
 *     select: { id: true, name: true, email: true },
 *     from: 'users',
 *     where: { active: { eq: true } }
 *   })
 *
 *   return (
 *     <ul>
 *       {data.map(user => <li key={user.id}>{user.name}</li>)}
 *     </ul>
 *   )
 * }
 *
 * // Parent component with Suspense boundary
 * function App() {
 *   return (
 *     <Suspense fallback={<div>Loading users...</div>}>
 *       <UserList />
 *     </Suspense>
 *   )
 * }
 */
export const useDatabaseSuspenseQuery = <
  TFrom extends keyof ExtractTables,
  TSelect extends SelectableColumns<TFrom>,
  TData = SelectedData<TSelect, TFrom>,
>(
  options:
    | {
        select: TSelect
        from: TFrom
        where?: WhereClause<ExtractTables[TFrom]['$inferSelect']>
        orderBy?: OrderClause<TFrom, keyof TSelect>
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

/**
 * React hook for database mutations (insert, update, delete) with type safety
 * @template TAction - The action type ('insert' | 'update' | 'delete')
 * @template TTable - The table name type from the database schema
 * @template TValues - The values type for insert operations (inferred from table schema)
 * @param {Object|ReturnType<typeof createDatabaseMutationOptions>} options - Mutation configuration or pre-built mutation options
 * @param {TAction} options.action - The type of database action to perform
 * @param {TTable} options.table - The table name to perform the action on
 * @param {Omit<UseMutationOptions, 'mutationKey' | 'mutationFn'>} [mutationOptions] - Additional React Query mutation options
 * @returns {UseMutationResult} React Query mutation result with mutate function and state
 *
 * @description
 * The mutation function expects different parameters based on the action:
 * - **insert**: Requires the full record data matching the table schema
 * - **update**: Requires `{ where: UpdateWhereClause, data: Partial<TValues> }`
 * - **delete**: Requires `UpdateWhereClause` (where conditions)
 *
 * @example
 * // Insert mutation
 * const insertUser = useDatabaseMutation({
 *   action: 'insert',
 *   table: 'users'
 * })
 *
 * const handleCreateUser = () => {
 *   insertUser.mutate({
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     age: 30
 *   })
 * }
 *
 * @example
 * // Update mutation
 * const updateUser = useDatabaseMutation({
 *   action: 'update',
 *   table: 'users'
 * })
 *
 * const handleUpdateUser = (userId: number) => {
 *   updateUser.mutate({
 *     where: { id: userId },
 *     data: { name: 'Jane Doe' }
 *   })
 * }
 *
 * @example
 * // Delete mutation
 * const deleteUser = useDatabaseMutation({
 *   action: 'delete',
 *   table: 'users'
 * })
 *
 * const handleDeleteUser = (userId: number) => {
 *   deleteUser.mutate({ id: userId })
 * }
 *
 * @example
 * // With additional mutation options
 * const createUser = useDatabaseMutation(
 *   { action: 'insert', table: 'users' },
 *   {
 *     onSuccess: () => {
 *       console.log('User created successfully!')
 *       queryClient.invalidateQueries(['users'])
 *     },
 *     onError: (error) => {
 *       console.error('Failed to create user:', error)
 *     }
 *   }
 * )
 */
export const useDatabaseMutation = <
  TAction extends ActionType,
  TTable extends keyof ExtractTables,
  TValues extends ExtractTables[TTable]['$inferInsert'],
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
          ? { where: UpdateWhereClause<TTable>; data: Partial<TValues> }
          : UpdateWhereClause<TTable>
    >,
    'mutationKey' | 'mutationFn'
  >,
): UseMutationResult<
  void,
  Error,
  TAction extends 'insert'
    ? TValues
    : TAction extends 'update'
      ? { where: UpdateWhereClause<TTable>; data: Partial<TValues> }
      : UpdateWhereClause<TTable>
> => {
  if (typeof options === 'object' && 'action' in options && 'table' in options)
    options = createDatabaseMutationOptions(options)

  return useMutation({
    ...options,
    ...mutationOptions,
  })
}
