# Yuki DB

A type-safe database abstraction layer that integrates seamlessly with React Query and popular ORMs like Drizzle. Yuki DB provides a simple, declarative API for database operations with built-in caching, optimistic updates, and real-time synchronization.

## Features

- 🔥 **Type-safe**: Full TypeScript support with automatic type inference
- ⚡ **React Query Integration**: Built-in caching, background updates, and optimistic mutations
- 🎯 **Declarative API**: Simple, intuitive syntax for database operations
- 🔄 **Real-time Updates**: Automatic cache invalidation and synchronization
- 🛠️ **ORM Agnostic**: Currently supports Drizzle ORM with Prisma support coming soon
- 📦 **Framework Flexible**: Works with Next.js, React Router, and other React frameworks that support RSC (React Server Components).

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

## Setup Guide

### Drizzle

1. **Define your database schema** using Drizzle ORM in `src/server/db/schema.ts`.

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

2. **Create a database instance** in `src/server/db/index.ts`.

```typescript
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'

export const db = drizzle(process.env.DATABASE_URL)
```

3. **Create API handlers** using the `createHandler` function from `yuki-db/drizzle`.

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

4. **Set up API routes** in your framework of choice.

**Next.js App Router:**

```typescript
// src/app/api/db/route.ts

export { GET, POST } from '@/lib/db'
```

**React Router v7:**

```typescript
// src/routes/api.db.ts

import type { Route } from './+types/api.db'
import { GET, POST } from '@/lib/db'

export const loader = async ({ request }: Route.LoaderArgs) => GET(request)
export const action = async ({ request }: Route.ActionArgs) => POST(request)
```

5. **Configure React Query** and wrap your app with the provider.

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

### Prisma (comming soon)

## Usage

### Query Hooks

Use `useDatabaseQuery` for fetching data with automatic caching and background updates:

```tsx
import { useDatabaseQuery } from 'yuki-db/drizzle'

function PostsList() {
  const {
    data: posts,
    isLoading,
    error,
  } = useDatabaseQuery({
    select: ['id', 'title', 'content', 'createdAt'],
    from: 'posts',
  })

  if (isLoading) return <div>Loading posts...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {posts?.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <time>{post.createdAt.toLocaleDateString()}</time>
        </article>
      ))}
    </div>
  )
}
```

### Mutation Hooks

Use `useDatabaseMutation` for creating, updating, and deleting data with optimistic updates:

```tsx
import { useDatabaseMutation } from 'yuki-db/drizzle'

function CreatePost() {
  const { mutate: createPost, isPending } = useDatabaseMutation({
    action: 'insert',
    table: 'posts',
    onSuccess: () => {
      // Automatically invalidates and refetches related queries
      console.log('Post created successfully!')
    },
    onError: (error) => {
      console.error('Failed to create post:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    createPost({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name='title' placeholder='Post title' required />
      <textarea name='content' placeholder='Post content' required />
      <button type='submit' disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
