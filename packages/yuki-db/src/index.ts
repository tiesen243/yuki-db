/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { eq } from 'drizzle-orm'

import type { ActionType, Database } from './types'

export type { Database } from './types'

// @ts-expect-error - db, schema are injected at build time
export function createHandler({ db, schema }: Database) {
  return {
    GET: async (request: Request) => {
      const url = new URL(request.url)
      const select = url.searchParams.get('select')?.split(',')
      const from = url.searchParams.get('from')
      if (!select || !from)
        return new Response('Invalid request', { status: 400 })

      const data = await db
        .select(
          select.reduce<Record<string, boolean>>((acc, key) => {
            acc[key] = schema[from][key]
            return acc
          }, {}),
        )
        .from(schema[from])

      return Response.json(data, {
        headers: { 'Content-Type': 'application/json' },
      })
    },

    POST: async (request: Request) => {
      const url = new URL(request.url)
      const action = url.searchParams.get('action') as ActionType
      const table = url.searchParams.get('table')
      const values = await request.json()

      try {
        if (action === 'insert') {
          await db.insert(schema[table]).values(values)
        } else if (action === 'update') {
          const id = url.searchParams.get('id')
          if (!id)
            return new Response('ID is required for update', { status: 400 })
          await db
            .update(schema[table])
            .set(values)
            .where(eq(schema[table].id, id))
        }
        return new Response('Operation successful', { status: 200 })
      } catch (error) {
        console.error('Database operation failed:', error)
        return new Response('Database operation failed', { status: 500 })
      }
    },
  }
}
