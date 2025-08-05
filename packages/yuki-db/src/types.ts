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

export type OrderClause<TSelect> = Partial<
  Record<TSelect[number], 'asc' | 'desc'>
>

export type SelectableColumns<TFrom> =
  (keyof (Database['schema'][TFrom] extends {
    $inferSelect: unknown
  }
    ? // @ts-expect-error - schema will be registered by the user
      Database['schema'][TFrom]['$inferSelect']
    : // @ts-expect-error - schema will be registered by the user
      Database['schema'][TFrom]))[]

export type SelectedData<TSelect, TFrom> = {
  // @ts-expect-error - schema will be registered by the user
  [K in TSelect[number]]: (Database['schema'][TFrom] extends {
    $inferSelect: unknown
  }
    ? // @ts-expect-error - schema will be registered by the user
      Database['schema'][TFrom]['$inferSelect']
    : // @ts-expect-error - schema will be registered by the user
      Database['schema'][TFrom])[K]
}
