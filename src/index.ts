import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shipping Binaries</title>
  </head>
  <body>
    <main>
      <h1>Shipping Binaries</h1>
      <p>Hello from Hono.</p>
    </main>
  </body>
</html>`)
})

export default app
