/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ActionType, Database } from '../types'

// @ts-expect-error - db is injected at build time
export function createHandler({ db }: Omit<Database, 'schema'>) {
  return {
    GET: async (request: Request) => {
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

    POST: async (request: Request) => {
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
