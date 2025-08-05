import { createServerFileRoute } from '@tanstack/react-start/server'
import { createHandler } from 'yuki-db/prisma'

import type { PostCreateInput, PostModel } from '@/server/db/generated/models'
import { db } from '@/server/db'

const { GET, POST } = createHandler({ db })
export const ServerRoute = createServerFileRoute('/api/db').methods({
  GET: ({ request }) => GET(request),
  POST: ({ request }) => POST(request),
})

declare module 'yuki-db/prisma' {
  interface Database {
    db: typeof db
    schema: {
      post: {
        $inferSelect: PostModel
        $inferInsert: PostCreateInput
      }
    }
  }
}
