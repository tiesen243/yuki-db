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
      const order = url.searchParams.get('order')
      const limit = url.searchParams.get('limit')
      const offset = url.searchParams.get('offset')

      console.log({
        select,
        from,
        where,
        order,
        limit,
        offset,
      })
    },

    POST: async (request: Request) => {
      const url = new URL(request.url)
      const action = url.searchParams.get('action') as ActionType
      const table = url.searchParams.get('table')
      const data = await request.json()

      console.log({
        action,
        table,
        data,
      })
    },
  }
}

export type { Database } from '../types'
