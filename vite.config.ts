import tailwindcss from '@tailwindcss/vite'
import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    devServer({
      entry: 'src/index.tsx'
    })
  ],
  server: {
    port: 3000
  }
})
