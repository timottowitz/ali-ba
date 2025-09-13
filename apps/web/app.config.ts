import { defineConfig } from '@tanstack/start/config'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  vite: {
    plugins: [
      TanStackRouterVite(),
      react()
    ],
  },
  server: {
    preset: 'vercel'
  }
})
