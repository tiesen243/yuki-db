import { useDatabaseMutation, useDatabaseQuery } from 'yuki-db/drizzle/client'

import { Button } from '@yuki/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@yuki/ui/card'

export default function HomePage() {
  const { data, isLoading, refetch } = useDatabaseQuery(
    {
      select: ['id', 'title', 'content', 'createdAt'],
      from: 'posts',
    },
    [],
  )

  const { mutate, isPending } = useDatabaseMutation({
    action: 'insert',
    table: 'posts',
    onSuccess: () => {
      refetch()
    },
  })

  return (
    <main className='container'>
      <p>Is loading: {isLoading ? 'true' : 'false'}</p>

      <Button
        disabled={isPending}
        onClick={() =>
          mutate({
            title: 'New Post',
            content: 'This is a new post created from the client.',
          })
        }
      >
        Create Post
      </Button>

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
