import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { Toaster } from 'sonner'
import '../styles/globals.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ConvexAuthProvider client={convex}>
      <div className="min-h-screen bg-gray-50">
        <Outlet />
        <Toaster />
      </div>
      <TanStackRouterDevtools position="bottom-right" />
    </ConvexAuthProvider>
  )
}
