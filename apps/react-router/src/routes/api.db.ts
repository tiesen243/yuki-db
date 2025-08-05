import 'yuki-db'

import { createHandler } from 'yuki-db/drizzle'

import { db } from '@yuki/db'
import * as schema from '@yuki/db/schema'

import type { Route } from './+types/api.db'

const { GET, POST } = createHandler({ db, schema })

export const loader = async ({ request }: Route.LoaderArgs) => GET(request)
export const action = async ({ request }: Route.ActionArgs) => POST(request)

declare module 'yuki-db' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}
