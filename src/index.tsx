import { Hono } from 'hono'
import { About } from './pages/About.js'
import { Blog } from './pages/Blog.js'
import { Home } from './pages/Home.js'

const app = new Hono()

app.get('/', (c) => {
  return c.html(<Home />)
})

app.get('/about', (c) => {
  return c.html(<About />)
})

app.get('/blog', (c) => {
  return c.html(<Blog />)
})

export default app
