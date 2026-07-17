import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index.js'

// Locally we serve the built assets ourselves. On Vercel the platform serves
// everything under public/ statically, so this route is only used in dev.
app.use('/static/*', serveStatic({ root: './public' }))

const port = Number(process.env.PORT ?? 3000)

serve({
  fetch: app.fetch,
  port
})

console.log(`Server running at http://localhost:${port}`)
