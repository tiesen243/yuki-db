import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'

import { ThemeProvider } from '@yuki/ui'

// @ts-expect-error - globals.css is a CSS file, not a module
import globalsCss from '@/globals.css?url'
import { createMetadata } from '@/lib/metadata'
import { createQueryClient } from '@/lib/query-client'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: createMetadata({ title: 'Tanstack Start' }),
    // prettier-ignore
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Geist:wght@100..900&display=swap' },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      { rel: 'stylesheet', href: globalsCss },
    ],
  }),

  component: RootLayout,

  notFoundComponent: () => (
    <div className='flex h-screen items-center justify-center'>
      <h1 className='text-2xl font-bold'>404 - Page Not Found</h1>
    </div>
  ),
})

let clientQueryClientSingleton: QueryClient | undefined = undefined
const getQueryClient = () => {
  if (typeof window === 'undefined') return createQueryClient()
  else return (clientQueryClientSingleton ??= createQueryClient())
}

function RootLayout() {
  const queryClient = getQueryClient()

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className='flex min-h-dvh flex-col font-sans antialiased'>
        <ThemeProvider attribute='class' disableTransitionOnChange enableSystem>
          <QueryClientProvider client={queryClient}>
            <Outlet />
          </QueryClientProvider>
        </ThemeProvider>

        <Scripts />
      </body>
    </html>
  )
}
