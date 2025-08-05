/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { ActionType, Database } from '../types'

/**
 * Creates a database handler with GET and POST methods for Prisma database operations
 * @param {Omit<Database, 'schema'>} options - Database configuration object without schema
 * @param {unknown} options.db - The Prisma client instance
 * @returns {Object} Handler object with GET and POST methods for database operations
 */
// @ts-expect-error - db is injected at build time
export function createHandler({ db }: Omit<Database, 'schema'>): object {
  return {
    /**
     * Handles GET requests for querying database records using Prisma
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
     *
     * @throws {Response} 400 - When required parameters (select, from) are missing
     * @throws {Response} 500 - When database operation fails
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

      const result = await db[from].findMany({
        select: select.reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true
          return acc
        }, {}),
        where: where
          ? (JSON.parse(where) as Record<string, unknown>)
          : undefined,
        orderBy: orderBy
          ? (JSON.parse(orderBy) as Record<string, 'asc' | 'desc'>)
          : undefined,
        take: limit ? parseInt(limit, 10) : undefined,
        skip: offset ? parseInt(offset, 10) : undefined,
      })

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    },

    /**
     * Handles POST requests for database write operations (insert, update, delete) using Prisma
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
     * POST /api?action=update&table=users&where={"id":1}
     * Body: { "name": "Jane" }
     *
     * @example
     * POST /api?action=delete&table=users&where={"id":1}
     *
     * @throws {Response} 500 - When database operation fails
     */
    POST: async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      const action = url.searchParams.get('action') as ActionType
      const table = url.searchParams.get('table')
      const data = await request.json()

      try {
        if (action === 'insert') {
          await db[table].create({ data })
        } else {
          const where = url.searchParams.get('where')
          const whereCondition = JSON.parse(where ?? '{}')

          if (action === 'delete')
            await db[table].delete({ where: whereCondition })
          else
            await db[table].update({
              where: whereCondition,
              data: data as Record<string, unknown>,
            })
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
