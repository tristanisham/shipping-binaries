import { Hono } from 'hono'
import api from './routers/api.js'
import home from './routers/home.js'
import blog from './routers/blog.js'

const app = new Hono()

// Routers live in ./routers and are mounted here. Rendering lives in ./views.
app.route('/', api)
app.route('/', home)
app.route('/', blog)

export default app
