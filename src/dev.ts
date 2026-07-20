import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './index.js'

const port = Number(process.env.PORT ?? 3000)

app.use('/styles.css', serveStatic({ path: './public/styles.css' }))

serve({
  fetch: app.fetch,
  port
})

console.log(`Server running at http://localhost:${port}`)
