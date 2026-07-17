import { Hono } from 'hono'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'
import { Blog } from '../views/Blog.js'
import { Post } from '../views/Post.js'
import { NotFound } from '../views/NotFound.js'

const postsDir = join(process.cwd(), 'content', 'posts')

type Frontmatter = Record<string, string>

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: raw }
  const data: Frontmatter = {}
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    data[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  return { data, body: match[2] }
}

function listPosts() {
  if (!existsSync(postsDir)) return []
  return readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const { data } = parseFrontmatter(readFileSync(join(postsDir, file), 'utf8'))
      return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? '',
        description: data.description ?? ''
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

function readPost(slug: string) {
  const file = join(postsDir, `${slug}.md`)
  if (!existsSync(file)) return null
  const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'))
  return {
    title: data.title ?? slug,
    date: data.date ?? '',
    html: marked.parse(body) as string
  }
}

const blog = new Hono()

blog.get('/blog', (c) => c.html(Blog({ currentPath: c.req.path, posts: listPosts() })))

blog.get('/blog/:slug', (c) => {
  const post = readPost(c.req.param('slug'))
  if (!post) return c.html(NotFound({ currentPath: c.req.path }), 404)
  return c.html(Post({ currentPath: c.req.path, post }))
})

export default blog
