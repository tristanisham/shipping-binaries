import { Base } from './layouts/Base.js'

type PostSummary = {
  slug: string
  title: string
  date: string
  description: string
}

type BlogProps = {
  currentPath: string
  posts: PostSummary[]
}

export function Blog({ currentPath, posts }: BlogProps) {
  return (
    <Base title='Blog' currentPath={currentPath}>
      <h1 class='mb-6 text-3xl font-bold'>Blog</h1>
      {posts.length === 0 ? (
        <p class='text-gray-500'>No posts yet.</p>
      ) : (
        <ul class='space-y-4'>
          {posts.map((post) => (
            <li>
              <a href={`/blog/${post.slug}`} class='text-red-600 hover:text-orange-600'>
                {post.title}
              </a>
              {post.date ? <span class='ml-2 text-sm text-gray-500'>{post.date}</span> : null}
              {post.description ? <p class='text-gray-600'>{post.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Base>
  )
}
