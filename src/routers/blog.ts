import { Hono } from 'hono'
import { getPost, listPosts } from '../lib/posts.js'
import { Blog } from '../views/Blog.js'
import { Post } from '../views/Post.js'
import { NotFound } from '../views/NotFound.js'

const blog = new Hono()

blog.get('/blog', (c) => c.html(Blog({ currentPath: c.req.path, posts: listPosts() })))

blog.get('/blog/:slug', (c) => {
  const post = getPost(c.req.param('slug'))
  if (!post) return c.html(NotFound({ currentPath: c.req.path }), 404)
  return c.html(Post({ currentPath: c.req.path, post }))
})

export default blog
