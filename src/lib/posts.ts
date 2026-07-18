import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { marked } from 'marked'

const postsDir = join(process.cwd(), 'content', 'posts')

export type PostMeta = {
  slug: string
  title: string
  description: string
  keywords: string[]
  author: string
  date: string
  draft: boolean
}

export type Post = PostMeta & {
  html: string
}

type RawFrontmatter = Record<string, string>

// Strip matching surrounding quotes from a scalar value.
function unquote(raw: string): string {
  const value = raw.trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

// keywords accept either `a, b, c` or `[a, b, c]`.
function parseKeywords(raw: string): string[] {
  const value = raw.trim()
  const inner = value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
  return inner
    .split(',')
    .map((keyword) => unquote(keyword))
    .filter((keyword) => keyword.length > 0)
}

export function parseFrontmatter(content: string): { data: RawFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, body: content }

  const data: RawFrontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = line.indexOf(':')
    if (sep === -1) continue
    data[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
  }
  return { data, body: match[2] }
}

function toMeta(fileSlug: string, data: RawFrontmatter): PostMeta {
  return {
    slug: data.slug ? unquote(data.slug) : fileSlug,
    title: data.title ? unquote(data.title) : fileSlug,
    description: data.description ? unquote(data.description) : '',
    keywords: data.keywords ? parseKeywords(data.keywords) : [],
    author: data.author ? unquote(data.author) : '',
    date: data.date ? unquote(data.date) : '',
    draft: data.draft ? unquote(data.draft).toLowerCase() === 'true' : false
  }
}

function readAll(): { meta: PostMeta; body: string }[] {
  if (!existsSync(postsDir)) return []
  return readdirSync(postsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const fileSlug = file.replace(/\.md$/, '')
      const { data, body } = parseFrontmatter(readFileSync(join(postsDir, file), 'utf8'))
      return { meta: toMeta(fileSlug, data), body }
    })
}

// Published posts, newest first. Drafts are excluded from listings.
export function listPosts(): PostMeta[] {
  return readAll()
    .filter((post) => !post.meta.draft)
    .map((post) => post.meta)
    .sort((a, b) => b.date.localeCompare(a.date))
}

// A single post by slug (honouring a frontmatter slug override). Drafts are
// unlisted but still reachable by direct URL so they can be previewed.
export function getPost(slug: string): Post | null {
  const found = readAll().find((post) => post.meta.slug === slug)
  if (!found) return null
  return { ...found.meta, html: marked.parse(found.body) as string }
}

// Canonical permalink for a post: /yyyy/mm/dd/slug, derived from its date.
// Returns null if the post has no (parseable) date.
export function postPath(post: Pick<PostMeta, 'slug' | 'date'>): string | null {
  const m = post.date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return `/${m[1]}/${m[2]}/${m[3]}/${post.slug}`
}

// Look up a post by its dated permalink. The date in the URL must match the
// post's frontmatter date, so each post has exactly one canonical URL.
export function getPostByPath(
  year: string,
  month: string,
  day: string,
  slug: string
): Post | null {
  const post = getPost(slug)
  if (!post) return null
  return postPath(post) === `/${year}/${month}/${day}/${slug}` ? post : null
}
