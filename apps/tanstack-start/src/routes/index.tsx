import { createFileRoute } from '@tanstack/react-router'
import { useDatabaseMutation, useDatabaseQuery } from 'yuki-db'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { data } = useDatabaseQuery({
    from: 'post',
    select: { id: true, title: true, content: true },
    order: {
      content: 'asc',
    },
  })

  const a = useDatabaseMutation({
    action: 'update',
    table: 'post',
  })

  a.mutate({
    where: { id: { eq: '1' } },
    data: { title: 'Updated Title' },
  })

  return <main className='container'></main>
}
