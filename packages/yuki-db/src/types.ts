/**
 * Base database interface that will be augmented by user's schema definition
 * @description This interface is intentionally empty and will be extended through module augmentation
 * when users register their database schema. The schema property will contain table definitions.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}

/**
 * Defines the available database action types for mutations
 * @description Used to specify what kind of operation to perform on the database
 */
export type ActionType = 'insert' | 'update' | 'delete'

/**
 * Defines the available comparison operators for WHERE clauses
 * @description
 * - `eq`: Equal to
 * - `like`: Pattern matching (case-insensitive)
 * - `gt`: Greater than
 * - `gte`: Greater than or equal to
 * - `lt`: Less than
 * - `lte`: Less than or equal to
 * - `ne`: Not equal to
 */
export type WhereOperator = 'eq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'

/**
 * Represents field-level conditions for database queries
 * @template T - The type of the field value
 * @description Creates a partial record mapping operators to values for a specific field
 * @example
 * // Age conditions
 * const ageCondition: FieldCondition<number> = {
 *   gt: 18,
 *   lte: 65
 * }
 *
 * // Name conditions
 * const nameCondition: FieldCondition<string> = {
 *   like: '%john%',
 *   ne: 'admin'
 * }
 */
export type FieldCondition<T> = Partial<Record<WhereOperator, T>>

/**
 * Represents a complete WHERE clause with support for complex logical operations
 * @template TSchema - The schema type representing table structure
 * @description
 * Supports field-level conditions and logical operators (OR, AND, NOT) for complex queries.
 * Field conditions use the FieldCondition type, while logical operators allow nesting.
 *
 * @example
 * // Simple field conditions
 * const simpleWhere: WhereClause<User> = {
 *   age: { gt: 18 },
 *   status: { eq: 'active' }
 * }
 *
 * @example
 * // Complex logical operations
 * const complexWhere: WhereClause<User> = {
 *   OR: [
 *     { role: { eq: 'admin' } },
 *     {
 *       AND: {
 *         age: { gte: 21 },
 *         verified: { eq: true }
 *       }
 *     }
 *   ],
 *   NOT: {
 *     status: { eq: 'banned' }
 *   }
 * }
 */
export type WhereClause<TSchema> = {
  [K in keyof TSchema]?: FieldCondition<TSchema[K]>
} & {
  OR?: WhereClause<TSchema>[]
  AND?: WhereClause<TSchema>
  NOT?: WhereClause<TSchema>
}

/**
 * Simplified WHERE clause for update and delete operations
 * @template TTable - The table name type from the database schema
 * @description
 * Provides a simpler interface for update/delete operations using direct field equality.
 * Unlike the full WhereClause, this only supports direct field matching without operators.
 *
 * @example
 * // Update where conditions
 * const updateWhere: UpdateWhereClause<'users'> = {
 *   id: 123,
 *   status: 'active'
 * }
 */
export type UpdateWhereClause<TTable extends keyof ExtractTables> = Partial<{
  [K in keyof ExtractTables[TTable]['$inferSelect']]: ExtractTables[TTable]['$inferSelect'][K]
}>

/**
 * Extracts table definitions from the registered database schema
 * @description
 * This type extracts the 'schema' property from the Database interface, which contains
 * all table definitions. The @ts-expect-error is used because the schema property
 * will be added through module augmentation by the user.
 */
// @ts-expect-error - schema will be registered by the user
export type ExtractTables = Database['schema']

/**
 * Defines ordering options for query results
 * @template TFrom - The table name type from the database schema
 * @description
 * Creates a partial record mapping field names to sort directions ('asc' or 'desc').
 * Multiple fields can be specified for multi-column sorting.
 *
 * @example
 * // Single field ordering
 * const order: OrderClause<'users'> = {
 *   createdAt: 'desc'
 * }
 *
 * @example
 * // Multi-field ordering
 * const multiOrder: OrderClause<'users'> = {
 *   status: 'asc',
 *   createdAt: 'desc',
 *   name: 'asc'
 * }
 */
export type OrderClause<
  TFrom extends keyof ExtractTables,
  TSelect extends keyof SelectableColumns<TFrom>,
> = Partial<Record<TSelect, 'asc' | 'desc'>>

/**
 * Defines which columns to select in a query
 * @template TFrom - The table name type from the database schema
 * @description
 * Creates a partial record mapping field names to boolean values indicating
 * whether each field should be included in the query results.
 *
 * @example
 * // Select specific columns
 * const select: SelectableColumns<'users'> = {
 *   id: true,
 *   name: true,
 *   email: true,
 *   password: false // exclude sensitive data
 * }
 *
 * @example
 * // Select all columns (when not specified, defaults to all)
 * const selectAll: SelectableColumns<'users'> = {}
 */
export type SelectableColumns<TFrom extends keyof ExtractTables> = {
  [K in keyof ExtractTables[TFrom]['$inferSelect']]?: boolean
}

/**
 * Transforms selected columns into the resulting data type
 * @template TSelect - The column selection type
 * @template TFrom - The table name type from the database schema
 * @description
 * Creates a new type containing only the fields that were selected (marked as true).
 * This ensures type safety by only including fields that were actually requested
 * in the query results.
 *
 * @example
 * // If TSelect = { id: true, name: true, email: false }
 * // And TFrom = 'users'
 * // Result type will be: { id: number, name: string }
 * // (email is excluded because it was false)
 *
 * type UserSelection = SelectableColumns<'users'> = {
 *   id: true,
 *   name: true,
 *   email: false
 * }
 *
 * type ResultData = SelectedData<UserSelection, 'users'>
 * // ResultData = { id: number, name: string }
 */
export type SelectedData<TSelect, TFrom extends keyof ExtractTables> = {
  [K in keyof TSelect as TSelect[K] extends true
    ? K
    : never]: ExtractTables[TFrom]['$inferSelect'][K]
}
