import { createServerFileRoute } from '@tanstack/react-start/server'

export const ServerRoute = createServerFileRoute('/api/db').methods({
  GET: () => ({
    helllo: 'world',
  }),
})
