import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  createDatabaseQueryOptions,
  useDatabaseMutation,
  useDatabaseQuery,
} from 'yuki-db/drizzle/client'

import { Button } from '@yuki/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@yuki/ui/card'
import { Input } from '@yuki/ui/input'

export default function HomePage() {
  const queryOptions = createDatabaseQueryOptions({
    select: ['id', 'title', 'content', 'createdAt'],
    from: 'posts',
    where: {
      title: {
        ilike: '%sa%',
      },
    },
    order: {
      title: 'asc',
    },
  })

  const queryClient = useQueryClient()
  const { data, isLoading, error } = useDatabaseQuery(queryOptions)
  const { mutate, isPending } = useDatabaseMutation({
    action: 'insert',
    table: 'posts',
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryOptions.queryKey,
      })
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
        onSubmit={async (e) => {
          e.preventDefault()
          await mutate(formData)
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

        <Button disabled={isPending}>Create Post</Button>
      </form>

      <div className='mt-4 grid grid-cols-3 gap-4'>
        {data?.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle>{d.title}</CardTitle>
              <CardDescription>
                {d.createdAt.toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{d.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}
