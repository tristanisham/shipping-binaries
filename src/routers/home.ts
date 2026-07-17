import { Hono } from 'hono'
import { Home } from '../views/Home.js'
import { About } from '../views/About.js'

const home = new Hono()

home.get('/', (c) => c.html(Home({ currentPath: c.req.path })))
home.get('/about', (c) => c.html(About({ currentPath: c.req.path })))

export default home
