import '@yuki/validators/env'

import { cache } from 'react'
import { createRouter as createTanStackRouter } from '@tanstack/react-router'

import { createQueryClient } from '@/lib/query-client'
import { routeTree } from './routeTree.gen'

const getQueryClient = cache(createQueryClient)

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    context: { queryClient: getQueryClient() },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
