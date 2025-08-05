import { createHandler } from 'yuki-db/drizzle'

import type { Route } from './+types/api.db'
import { db } from '@/server/db'
import * as schema from '@/server/db/schema'

const { GET, POST } = createHandler({ db, schema })

export const loader = async ({ request }: Route.LoaderArgs) => GET(request)
export const action = async ({ request }: Route.ActionArgs) => POST(request)

declare module 'yuki-db/drizzle' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}
