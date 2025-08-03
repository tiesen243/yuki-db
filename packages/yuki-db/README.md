# Yuki DB

## Installation

```bash
npm install yuki-db @tanstack/react-query
# or
yarn add yuki-db @tanstack/react-query
# or
pnpm add yuki-db @tanstack/react-query
# or
bun add yuki-db @tanstack/react-query
```

## Usage

### Drizzle

#### Setup

1. Define your database schema using Drizzle ORM in `src/server/db/schema.ts`.

```typescript
// src/server/db/schema.ts

import { pgTable } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', (t) => ({
  id: t.serial('id').primaryKey().notNull(),
  title: t.varchar({ length: 255 }).notNull(),
  content: t.varchar({ length: 1000 }).notNull(),
  createdAt: t.timestamp('created_at').defaultNow().notNull(),
}))
```

2. Create a database instance in `src/server/db/index.ts`.

```typescript
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'

export const db = drizzle(process.env.DATABASE_URL)
```

3. Use the `createHandler` function from `yuki-db/drizzle` to create API handlers for your database operations.

```typescript
// src/lib/db.ts

import { createHandler } from 'yuki-db/drizzle'

import { db } from '@/server/db'
import * as schema from '@/server/db/schema'

export const { GET, POST } = createHandler({ db, schema })

declare module 'yuki-db/drizzle' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}
```

4. Use the `GET` and `POST` handlers in your API routes.

- Next.js API Route Example:

```typescript
// src/app/api/db/route.ts
export { GET, POST } from '@/lib/db'
```

- React Router (v7) Example:

```typescript
// src/routes/api.db.ts
import type { Route } from './+types/api.db'
import { GET, POST } from '@/lib/db'

export const loader = async ({ request }: Route.LoaderArgs) => GET(request)
export const action = async ({ request }: Route.ActionArgs) => POST(request)
```

5. Set up your React Query client to use the `yuki-db` hooks.

```typescript
// src/lib/query-client.ts
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {},
    },
  })
```

```tsx
// src/components/provider.tsx
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'

let clientQueryClientSingleton: QueryClient | undefined = undefined
const getQueryClient = () => {
  if (typeof window === 'undefined') return createQueryClient()
  else return (clientQueryClientSingleton ??= createQueryClient())
}

export function Provider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

Then wrap your application with the `Provider` component:

```tsx
// src/app/layout.tsx
import { Provider } from '@/components/provider'

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en'>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  )
}
```

#### Query Hooks

```typescript
const { data, isLoading, error, refetch } = useDatabaseQuery(
  {
    select: ['id', 'title', 'content', 'createdAt'],
    from: 'posts',
  },
  [],
)
```

#### Mutation Hooks

```typescript
const { mutate, isPending, error } = useDatabaseMutation({
  action: 'insert',
  table: 'posts',
  onSuccess: () => {},
  onError: (error) => {},
})
```

### Prisma (comming soon)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
