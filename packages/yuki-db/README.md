# Yuki DB

A type-safe database abstraction layer that seamlessly integrates with React Query and popular ORMs. Yuki DB provides a declarative API for database operations with built-in caching, optimistic updates, and real-time synchronization.

## Features

- 🔥 **Type-Safe**: Full TypeScript support with automatic type inference
- ⚡ **React Query Integration**: Built-in caching, background updates, and optimistic mutations
- 🎯 **Declarative API**: Simple, intuitive syntax for database operations
- 🔄 **Real-Time Updates**: Automatic cache invalidation and synchronization
- 🛠️ **ORM Agnostic**: Currently supports Drizzle ORM (Prisma support coming soon)
- 📦 **Framework Flexible**: Works with Next.js, React Router, and other React frameworks supporting RSC

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

## Quick Start

> **Note:** This example uses PostgreSQL with Drizzle ORM, but Yuki DB works with any database that your chosen ORM supports (MySQL, SQLite, etc.).

### 1. Database Schema Setup

Define your database schema:

**Drizzle ORM Example:**

```typescript
// src/server/db/schema.ts
import { pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core'

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: varchar('content', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Prisma Example:**

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client"
  previewFeatures = ["driverAdapters"]
  output          = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(255)
  content   String   @db.VarChar(1000)
  createdAt DateTime @default(now())
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique @db.VarChar(255)
  name      String   @db.VarChar(100)
  createdAt DateTime @default(now())
}
```

### 2. Database Instance

Create your database connection:

**Drizzle ORM Example:**

```typescript
// src/server/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'postgres'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const db = drizzle(pool)
```

**Prisma Example:**

```typescript
// src/server/db.ts
import { PrismaClient } from 'path/to/generated/prisma'

export const db = new PrismaClient()
```

### 3. API Handlers

Set up the Yuki DB handlers:

**Drizzle ORM Example:**

```typescript
// src/lib/db.ts
import { createHandler } from 'yuki-db/drizzle'

import { db } from '@/server/db'
import * as schema from '@/server/db/schema'

export const { GET, POST } = createHandler({ db, schema })

// Type augmentation for better IntelliSense
declare module 'yuki-db/drizzle' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}
```

**Prisma Example:** (coming soon)

### 4. Framework Integration

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

**Tanstack Start:**

```typescript
// src/routes/api.db.ts
import { createServerFileRoute } from '@tanstack/react-start/server'

import { GET, POST } from '@/lib/db'

export const ServerRoute = createServerFileRoute('/api/db').methods({
  GET: ({ request }) => GET(request),
  POST: ({ request }) => POST(request),
})
```

### 5. Query Client Setup

Configure React Query for your application:

```typescript
// src/lib/query-client.ts
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query'

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 3,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  })
```

```tsx
// src/components/providers.tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { createQueryClient } from '@/lib/query-client'

let clientQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    return (clientQueryClient ??= createQueryClient())
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
```

Wrap your app with the providers:

```tsx
// src/app/layout.tsx
import { Providers } from '@/components/providers'

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang='en'>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

## Usage Guide

### Querying Data

Use `useDatabaseQuery` to fetch data with automatic caching:

```tsx
import { useDatabaseQuery } from 'yuki-db'

function PostsList() {
  const {
    data: posts,
    isLoading,
    error,
    refetch,
  } = useDatabaseQuery({
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
    },
    from: 'posts',
  })

  if (isLoading) return <div>Loading posts...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <button onClick={() => refetch()}>Refresh Posts</button>
      {posts?.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
          <time>{new Date(post.createdAt).toLocaleDateString()}</time>
        </article>
      ))}
    </div>
  )
}
```

### Advanced Queries

```tsx
// Complex filtering with AND/OR conditions
const { data: filteredPosts } = useDatabaseQuery({
  select: { id: true, title: true },
  from: 'posts',
  where: {
    OR: [{ title: { like: '%typescript%' } }, { content: { like: '%react%' } }],
    AND: [{ createdAt: { gte: new Date('2024-01-01') } }],
  },
  order: {
    createdAt: 'desc',
    title: 'asc',
  },
  limit: 20,
  offset: 0,
})

// Pagination example
function PaginatedPosts() {
  const [page, setPage] = useState(0)
  const pageSize = 10

  const { data: posts, isLoading } = useDatabaseQuery({
    select: { id: true, title: true },
    from: 'posts',
    order: { createdAt: 'desc' },
    limit: pageSize,
    offset: page * pageSize,
  })

  return (
    <div>
      {/* Posts list */}
      <div className='pagination'>
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!posts || posts.length < pageSize}
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

### Mutations

Use `useDatabaseMutation` for data modifications:

#### Creating Records

```tsx
import { useDatabaseMutation } from 'yuki-db'

function CreatePostForm() {
  const {
    mutate: createPost,
    isPending,
    error,
  } = useDatabaseMutation(
    {
      action: 'insert',
      table: 'posts',
    },
    {
      onSuccess: () => console.log('Post created'),
      onError: (error) => console.error('Failed to create post:', error),
    },
  )

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
      <div>
        <label htmlFor='title'>Title:</label>
        <input
          id='title'
          name='title'
          type='text'
          placeholder='Enter post title'
          required
        />
      </div>
      <div>
        <label htmlFor='content'>Content:</label>
        <textarea
          id='content'
          name='content'
          placeholder='Enter post content'
          required
        />
      </div>
      {error && <div className='error'>Error: {error.message}</div>}
      <button type='submit' disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

#### Updating Records

```tsx
function EditPostForm({ postId }: { postId: number }) {
  const { mutate: updatePost, isPending } = useDatabaseMutation(
    {
      action: 'update',
      table: 'posts',
    },
    {
      onSuccess: () => console.log('Post updated successfully'),
    },
  )

  const handleUpdate = (updates: { title?: string; content?: string }) => {
    updatePost({
      where: { id: { eq: postId } },
      data: updates,
    })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        handleUpdate({
          title: formData.get('title') as string,
          content: formData.get('content') as string,
        })
      }}
    >
      {/* Form fields */}
      <button type='submit' disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Post'}
      </button>
    </form>
  )
}
```

#### Deleting Records

```tsx
function DeletePostButton({ postId }: { postId: number }) {
  const { mutate: deletePost, isPending } = useDatabaseMutation(
    {
      action: 'delete',
      table: 'posts',
    },
    {
      onSuccess: () => console.log('Post deleted successfully'),
    },
  )

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?'))
      deletePost({ id: { eq: postId } })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className='delete-button'
    >
      {isPending ? 'Deleting...' : 'Delete Post'}
    </button>
  )
}
```

### Query Options Factory

For better code organization and reusability:

```tsx
// src/services/post.ts
import {
  createDatabaseMutationOptions,
  createDatabaseQueryOptions,
} from 'yuki-db'

export const postQueries = {
  all: () =>
    createDatabaseQueryOptions({
      select: ['id', 'title', 'content', 'createdAt'],
      from: 'posts',
    }),

  byId: (id: number) =>
    createDatabaseQueryOptions({
      select: ['id', 'title', 'content', 'createdAt'],
      from: 'posts',
      where: { id: { eq: id } },
    }),

  create: () =>
    createDatabaseMutationOptions({
      action: 'insert',
      table: 'posts',
    }),

  update: () =>
    createDatabaseMutationOptions({
      action: 'update',
      table: 'posts',
    }),

  delete: () =>
    createDatabaseMutationOptions({
      action: 'delete',
      table: 'posts',
    }),
}

// Usage in components
function PostDetail({ id }: { id: number }) {
  const { data: post } = useDatabaseQuery(postQueries.byId(id))
  // Alternatively, you can use the `useQuery` hook directly:
  // import { useQuery } from '@tanstack/react-query'
  // const { data: post } = useQuery(postQueries.byId(id))

  return <div>{post?.title}</div>
}
```

### Invalidating

Use `invalidateQueries` to refresh data after mutations:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { createDatabaseQueryOptions } from 'yuki-db'

const queryClient = useQueryClient()
const queryOptions = createDatabaseQueryOptions({
  select: { id: true, title: true },
  from: 'posts',
})

queryClient.invalidateQueries({
  queryKey: queryOptions.queryKey,
})
```

## API Reference

### Core Functions

#### `createHandler`

Creates API route handlers for database operations.

**Drizzle ORM:**

```typescript
import { createHandler } from 'yuki-db/drizzle'

const { GET, POST } = createHandler({
  db: drizzleInstance,
  schema: schemaObject,
})
```

**Parameters:**

- `db`: Your Drizzle database instance
- `schema`: Your database schema definitions

**Returns:**

- `GET`: Handler for query operations
- `POST`: Handler for mutation operations

**Prisma ORM:**

```typescript
import { createHandler } from 'yuki-db/prisma'

const { GET, POST } = createHandler({
  db: prismaInstance,
})
```

### Client Hooks

#### `useDatabaseQuery`

Hook for fetching data with automatic caching and background updates.

```typescript
const a = 1

const result = useDatabaseQuery(
  {
    select: {
      id: true,
      title: true,
    },
    from: 'posts',
    where: { id: { eq: a } },
    order: { createdAt: 'desc' },
    limit: 10,
    offset: 0,
  },
  useQueryOptions,
)
```

**Options:**

- `select`: Array of column names to select
- `from`: Table name to query
- `where`: Optional filter conditions
- `order`: Optional sorting configuration
- `limit`: Maximum number of records to return
- `offset`: Number of records to skip (for pagination)

**Returns:**

- `data`: Query results (undefined while loading)
- `error`: Error object if query failed (null on success)
- `isLoading`: True when query is loading for the first time
- `isError`: True when query has encountered an error
- `isSuccess`: True when query has completed successfully
- `isFetching`: True when query is fetching (including background updates)
- `isRefetching`: True when query is refetching
- `isPending`: True when query is in pending state
- `isStale`: True when data is considered stale
- `refetch`: Function to manually refetch data
- `fetchStatus`: Current fetch status ('fetching' | 'paused' | 'idle')
- `status`: Current query status ('pending' | 'error' | 'success')

#### `useDatabaseMutation`

Hook for performing database mutations with optimistic updates.

```typescript
const mutation = useDatabaseMutation(
  {
    action: 'insert' | 'update' | 'delete',
    table: string,
  },
  UseMutationOptions,
)
```

**Options:**

- `action`: Type of mutation (`'insert'`, `'update'`, `'delete'`)
- `table`: Target table name

**Returns:**

- `data`: Mutation result data (always undefined)
- `error`: Error object if mutation failed (null on success)
- `isError`: True when mutation has encountered an error
- `isIdle`: True when mutation is in idle state
- `isPending`: True when mutation is currently executing
- `isSuccess`: True when mutation has completed successfully
- `mutate`: Function to trigger the mutation
- `mutateAsync`: Async version of mutate that returns a Promise
- `reset`: Function to reset mutation state to idle
- `status`: Current mutation status ('idle' | 'pending' | 'error' | 'success')

#### `useDatabaseSuspenseQuery`

Same as `useDatabaseQuery`, but throws an error if the query is not yet resolved, allowing you to use React's Suspense for loading states.

#### `createDatabaseQueryOptions`

Utility function to create reusable query options.

```typescript
const options = createDatabaseQueryOptions({
  select: { id: true, title: true },
  from: 'posts',
  where: { id: { eq: 1 } },
})
```

## Type System

### Where Clause Types

```typescript
export type WhereOperator = 'eq' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'ne'

export type FieldCondition<T> = Partial<Record<WhereOperator, T>>

export type WhereClause<TSchema> = {
  [K in keyof TSchema]?: FieldCondition<TSchema[K]>
} & {
  OR?: WhereClause<TSchema>[]
  AND?: WhereClause<TSchema>
  NOT?: WhereClause<TSchema>
}
```

### Schema Types

```typescript
export type ExtractTables = Database['schema']

export type ExtractSelect<TFrom extends keyof ExtractTables> =
  ExtractTables[TFrom] extends { $inferSelect: unknown }
    ? ExtractTables[TFrom]['$inferSelect']
    : ExtractTables[TFrom]

export type ExtractInsert<TFrom extends keyof ExtractTables> =
  ExtractTables[TFrom] extends { $inferInsert: unknown }
    ? ExtractTables[TFrom]['$inferInsert']
    : ExtractTables[TFrom]

export type SelectableColumns<TFrom extends keyof ExtractTables> = {
  [K in keyof ExtractSelect<TFrom>]?: boolean
}

export type SelectedData<TSelect, TFrom extends keyof ExtractTables> = {
  [K in keyof TSelect as TSelect[K] extends true
    ? K
    : never]: ExtractSelect<TFrom>[K]
}
```

### Order Clause Types

```typescript
export type OrderClause<
  TFrom extends keyof ExtractTables,
  TField extends keyof ExtractSelect<TFrom>,
> = Partial<Record<TField, 'asc' | 'desc'>>
```

### Query Options Types

```typescript
interface DatabaseQueryOptions<
  TFrom,
  TSelect,
  TData = SelectedData<TSelect, TFrom>,
> {
  select: TSelect
  from: TFrom
  where?: WhereClause<ExtractSelect<TFrom>>
  order?: OrderClause<TFrom, keyof TSelect>
  limit?: number
  offset?: number
}
```

### Mutation Options Types

```typescript
interface DatabaseMutationOptions<
  TAction extends ActionType,
  TTable extends keyof ExtractTables,
  TValues extends ExtractInsert<TTable>,
> {
  action: TAction
  table: TTable
}
```

## Migration Guide

### From Direct Drizzle Usage

Before (Direct Drizzle):

```typescript
const posts = await db.select().from(schema.posts).where(eq(schema.posts.id, 1))
```

Before (Direct Prisma):

```typescript
const posts = await db.post.findMany({
  where: { id: 1 },
  select: { id: true, title: true, content: true },
})
```

After (Yuki DB):

```tsx
const { data: posts } = useDatabaseQuery({
  select: ['id', 'title', 'content'],
  from: 'posts',
  where: { id: { eq: 1 } },
})
```

**Issue: Type errors with schema**

```typescript
// Make sure you have the proper module declaration

declare module 'yuki-db/drizzle' {
  interface Database {
    db: typeof db
    schema: typeof schema
  }
}

// Or

declare module 'yuki-db/prisma' {
  interface Database {
    db: typeof db
    schema: {
      posts: Post
      users: User
    }
  }
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
