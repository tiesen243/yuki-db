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

export type ExtractSelect<TFrom extends keyof ExtractTables> =
  ExtractTables[TFrom] extends { $inferSelect: unknown }
    ? ExtractTables[TFrom]['$inferSelect']
    : ExtractTables[TFrom]

export type ExtractInsert<TFrom extends keyof ExtractTables> =
  ExtractTables[TFrom] extends { $inferInsert: unknown }
    ? ExtractTables[TFrom]['$inferInsert']
    : ExtractTables[TFrom]

export type OrderClause<TFrom extends keyof ExtractTables> = Partial<
  Record<keyof ExtractSelect<TFrom>, 'asc' | 'desc'>
>

export type SelectableColumns<TFrom extends keyof ExtractTables> = {
  [K in keyof ExtractSelect<TFrom>]?: boolean
}

export type SelectedData<TSelect, TFrom extends keyof ExtractTables> = {
  [K in keyof TSelect as TSelect[K] extends true
    ? K
    : never]: ExtractSelect<TFrom>[K]
}
