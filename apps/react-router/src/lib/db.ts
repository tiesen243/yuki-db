import 'yuki-db'

import { createHandler } from 'yuki-db'

import { db } from '@yuki/db'
import * as schema from '@yuki/db/schema'

export const { GET, POST } = createHandler({ db, schema })

declare module 'yuki-db' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}
