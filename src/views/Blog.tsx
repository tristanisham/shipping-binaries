import { Base } from './layouts/Base.js'
import { postPath, type PostMeta } from '../lib/posts.js'

type BlogProps = {
  currentPath: string
  posts: PostMeta[]
}

export function Blog({ currentPath, posts }: BlogProps) {
  return (
    <Base title='Blog' currentPath={currentPath}>
      <div class='mx-auto max-w-2xl'>
        <h1 class='mb-6 text-3xl font-bold'>Blog</h1>
        {posts.length === 0 ? (
          <p class='text-gray-500'>No posts yet.</p>
        ) : (
          <ul class='space-y-6'>
            {posts.map((post) => {
              const href = postPath(post)
              return (
              <li>
                {href ? (
                  <a
                    href={href}
                    class='text-xl font-semibold text-red-600 hover:text-orange-600'
                  >
                    {post.title}
                  </a>
                ) : (
                  <span class='text-xl font-semibold'>{post.title}</span>
                )}
                <div class='text-sm text-gray-500'>
                  {post.author ? <span>{post.author}</span> : null}
                  {post.author && post.date ? ' · ' : null}
                  {post.date ? <time datetime={post.date}>{post.date}</time> : null}
                </div>
                {post.description ? <p class='mt-1 text-gray-600'>{post.description}</p> : null}
              </li>
              )
            })}
          </ul>
        )}
      </div>
    </Base>
  )
}
