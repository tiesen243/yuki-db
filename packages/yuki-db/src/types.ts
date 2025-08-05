// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}

export type ActionType = 'insert' | 'update' | 'delete'

export type WhereOperator = 'eq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'

export type FieldCondition<T> = Partial<Record<WhereOperator, T>>

export type WhereClause<TSchema> = {
  [K in keyof TSchema]?: FieldCondition<TSchema[K]>
} & {
  OR?: WhereClause<TSchema>[]
  AND?: WhereClause<TSchema>
  NOT?: WhereClause<TSchema>
}

// @ts-expect-error - schema will be registered by the user
export type ExtractTables = Database['schema']

export type OrderClause<TFrom extends keyof ExtractTables> = Partial<
  Record<keyof ExtractTables[TFrom]['$inferSelect'], 'asc' | 'desc'>
>

export type SelectableColumns<TFrom extends keyof ExtractTables> = {
  [K in keyof ExtractTables[TFrom]['$inferSelect']]?: boolean
}

export type SelectedData<TSelect, TFrom extends keyof ExtractTables> = {
  [K in keyof TSelect as TSelect[K] extends true
    ? K
    : never]: ExtractTables[TFrom]['$inferSelect'][K]
}
