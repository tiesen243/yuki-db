/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { AnyColumn, SQL, SQLWrapper } from 'drizzle-orm'
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lt,
  lte,
  not,
  or,
} from 'drizzle-orm'

import type { ActionType, Database } from '../types'

/**
 * Creates a database handler with GET and POST methods for database operations
 * @param {Database} options - Database configuration object
 * @param {unknown} options.db - The database connection instance
 * @param {Record<string, unknown>} options.schema - The database schema definition
 * @returns {Object} Handler object with GET and POST methods
 */
// @ts-expect-error - db, schema are injected at build time
export function createHandler({ db, schema }: Database): object {
  function buildWhereCondition(
    whereObj: Record<string, unknown>,
    tableSchema: Record<string, unknown>,
  ): SQL | undefined {
    const conditions: unknown[] = []

    for (const [key, value] of Object.entries(whereObj)) {
      if (key === 'OR') {
        const orConditions = (value as Record<string, unknown>[]).map(
          (condition) => buildWhereCondition(condition, tableSchema),
        )
        conditions.push(or(...orConditions))
      } else if (key === 'AND') {
        const andCondition = buildWhereCondition(
          value as Record<string, unknown>,
          tableSchema,
        )
        conditions.push(andCondition)
      } else if (key === 'NOT') {
        const notCondition = buildWhereCondition(
          value as Record<string, unknown>,
          tableSchema,
        )
        conditions.push(not(notCondition as SQLWrapper))
      } else {
        const fieldConditions = Object.entries(
          value as Record<string, unknown>,
        ).map(([op, val]) => {
          const field = tableSchema[key]
          switch (op) {
            case 'eq':
              return eq(field as never, val)
            case 'like':
              return ilike(field as never, val as string)
            case 'gt':
              return gt(field as never, val)
            case 'gte':
              return gte(field as never, val)
            case 'lt':
              return lt(field as never, val)
            case 'lte':
              return lte(field as never, val)
            case 'ne':
              return not(eq(field as never, val))
            default:
              throw new Error(`Unsupported operator: ${op}`)
          }
        })
        conditions.push(...fieldConditions)
      }
    }

    return conditions.length === 1
      ? (conditions[0] as SQL)
      : and(...(conditions as SQLWrapper[]))
  }

  return {
    /**
     * Handles GET requests for querying database records
     * @param {Request} request - The HTTP request object
     * @returns {Promise<Response>} JSON response with query results or error message
     *
     * @description
     * Supports the following query parameters:
     * - select: Comma-separated list of fields to select (required)
     * - from: Table name to query from (required)
     * - where: JSON string representing WHERE conditions (optional)
     * - orderBy: JSON object with field names and 'asc'/'desc' values (optional)
     * - limit: Maximum number of records to return (optional)
     * - offset: Number of records to skip (optional)
     *
     * @example
     * GET /api?select=id,name&from=users&where={"age":{"gt":18}}&orderBy={"name":"asc"}&limit=10
     */
    GET: async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      const select = url.searchParams.get('select')?.split(',')
      const from = url.searchParams.get('from')
      if (!select || !from)
        return new Response('Invalid request', { status: 400 })
      const where = url.searchParams.get('where')
      const orderBy = url.searchParams.get('orderBy')
      const limit = url.searchParams.get('limit')
      const offset = url.searchParams.get('offset')

      const query = db
        .select(
          select.reduce<Record<string, boolean>>((acc, key) => {
            acc[key] = schema[from][key]
            return acc
          }, {}),
        )
        .from(schema[from])

      let whereCondition: SQLWrapper | undefined
      if (where)
        try {
          const whereObj = JSON.parse(where)
          whereCondition = buildWhereCondition(
            whereObj as never,
            schema[from] as never,
          )
        } catch (error: unknown) {
          if (error instanceof Error)
            return new Response(`Invalid where clause: ${error.message}`, {
              status: 400,
            })
          return new Response('Invalid where clause', { status: 400 })
        }
      if (whereCondition) query.where(whereCondition)

      let orderCondition: SQL[] | undefined
      if (orderBy) {
        try {
          const orderObj = JSON.parse(orderBy) as Record<string, 'asc' | 'desc'>
          const orders = []
          for (const [key, direction] of Object.entries(orderObj)) {
            if (!select.includes(key))
              return new Response(`Invalid order field: ${key}`, {
                status: 400,
              })

            if (direction === 'asc')
              orders.push(asc(schema[from][key] as AnyColumn))
            else orders.push(desc(schema[from][key] as AnyColumn))
          }

          orderCondition = orders.length > 0 ? orders : undefined
        } catch (error: unknown) {
          if (error instanceof Error)
            return new Response(`Invalid order clause: ${error.message}`, {
              status: 400,
            })
          return new Response('Invalid order clause', { status: 400 })
        }
      }
      if (orderCondition) query.orderBy(...orderCondition)

      if (limit) {
        const limitValue = parseInt(limit, 10)
        if (isNaN(limitValue) || limitValue < 0)
          return new Response('Invalid limit value', { status: 400 })
        query.limit(limitValue)
      }

      if (offset) {
        const offsetValue = parseInt(offset, 10)
        if (isNaN(offsetValue) || offsetValue < 0)
          return new Response('Invalid offset value', { status: 400 })
        query.offset(offsetValue)
      }

      try {
        const result = await query.execute()
        return Response.json(result, {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development')
          console.error('Database query failed:', error)
        return new Response('Database query failed', { status: 500 })
      }
    },

    /**
     * Handles POST requests for database write operations (insert, update, delete)
     * @param {Request} request - The HTTP request object with JSON body containing data
     * @returns {Promise<Response>} Success or error response
     *
     * @description
     * Supports the following operations via query parameters:
     * - action: 'insert', 'update', or 'delete' (required)
     * - table: Table name to operate on (required)
     * - where: JSON string for update/delete conditions (required for update/delete)
     *
     * Request body should contain the data for insert/update operations.
     *
     * @example
     * POST /api?action=insert&table=users
     * Body: { "name": "John", "age": 25 }
     *
     * @example
     * POST /api?action=update&table=users&where={"id":{"eq":1}}
     * Body: { "name": "Jane" }
     */
    POST: async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      const action = url.searchParams.get('action') as ActionType
      const table = url.searchParams.get('table')
      const data = await request.json()

      try {
        if (action === 'insert') {
          await db.insert(schema[table]).values(data)
        } else {
          const where = url.searchParams.get('where')
          if (!where)
            return new Response('Where clause is required for update', {
              status: 400,
            })

          const whereCondition: SQLWrapper[] = []
          const whereObj = JSON.parse(where) as Record<string, unknown>
          for (const [key, value] of Object.entries(whereObj))
            whereCondition.push(eq(schema[table][key], value))
          if (whereCondition.length === 0)
            return new Response('Where condition is required for update', {
              status: 400,
            })

          if (action === 'update')
            await db
              .update(schema[table])
              .set(data)
              .where(...whereCondition)
          else await db.delete(schema[table]).where(...whereCondition)
        }

        return new Response('Operation successful', { status: 200 })
      } catch (error) {
        if (process.env.NODE_ENV === 'development')
          console.error('Database operation failed:', error)
        return new Response('Database operation failed', { status: 500 })
      }
    },
  }
}

export type { Database } from '../types'
