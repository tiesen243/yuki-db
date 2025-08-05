import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createDatabaseQueryOptions,
  useDatabaseMutation,
  useDatabaseQuery,
} from 'yuki-db'

import { Button } from '@yuki/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@yuki/ui/card'
import { Trash2Icon } from '@yuki/ui/icons'
import { Input } from '@yuki/ui/input'

const queryOptions = createDatabaseQueryOptions({
  select: ['id', 'title', 'content', 'createdAt'],
  from: 'posts',
  where: {
    title: {},
  },
  order: {
    createdAt: 'desc',
  },
})

export default function HomePage() {
  const queryClient = useQueryClient()

  const { data: posts, isLoading, error } = useDatabaseQuery(queryOptions)

  const { mutate: create, isPending: isCreating } = useDatabaseMutation({
    action: 'insert',
    table: 'posts',
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryOptions.queryKey,
      })
    },
    onError: (error) => {
      console.error('Error creating post:', error)
    },
  })

  const [formData, setFormData] = React.useState({
    title: '',
    content: '',
  })

  return (
    <main className='container'>
      <p>Is loading: {isLoading ? 'true' : 'false'}</p>
      <p>Error: {error ? error.message : 'No error'}</p>

      <form
        className='grid gap-4'
        onSubmit={(e) => {
          e.preventDefault()
          create(formData)
          setFormData({ title: '', content: '' })
        }}
      >
        <Input
          placeholder='Title'
          value={formData.title}
          onChange={(e) => {
            setFormData({ ...formData, title: e.target.value })
          }}
        />
        <Input
          placeholder='Content'
          value={formData.content}
          onChange={(e) => {
            setFormData({ ...formData, content: e.target.value })
          }}
        />

        <Button disabled={isCreating}>Create Post</Button>
      </form>

      <div className='mt-4 grid grid-cols-3 gap-4'>
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  )
}

const PostCard: React.FC<{
  post: { id: string; title: string; content: string; createdAt: Date }
}> = ({ post }) => {
  const queryClient = useQueryClient()

  const { mutate: remove, isPending: isRemoving } = useDatabaseMutation({
    action: 'delete',
    table: 'posts',
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryOptions.queryKey,
      })
    },
    onError: (error) => {
      console.error('Error removing post:', error)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{post.title}</CardTitle>
        <CardDescription>{post.createdAt.toLocaleDateString()}</CardDescription>

        <CardAction>
          <Button
            variant='ghost'
            size='icon'
            disabled={isRemoving}
            onClick={() => {
              remove({ id: { eq: post.id } })
            }}
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>{post.content}</p>
      </CardContent>
    </Card>
  )
}
