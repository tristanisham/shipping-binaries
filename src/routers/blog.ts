import { Hono } from 'hono'
import { getPostByPath, listPosts } from '../lib/posts.js'
import { Blog } from '../views/Blog.js'
import { Post } from '../views/Post.js'
import { NotFound } from '../views/NotFound.js'

const blog = new Hono()

blog.get('/blog', (c) => c.html(Blog({ currentPath: c.req.path, posts: listPosts() })))

// Posts render at their dated permalink: /yyyy/mm/dd/slug.
blog.get('/:year{[0-9]{4}}/:month{[0-9]{2}}/:day{[0-9]{2}}/:slug', (c) => {
  const { year, month, day, slug } = c.req.param()
  const post = getPostByPath(year, month, day, slug)
  if (!post) return c.html(NotFound({ currentPath: c.req.path }), 404)
  return c.html(Post({ currentPath: c.req.path, post }))
})

export default blog
