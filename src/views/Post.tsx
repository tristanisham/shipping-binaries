import { Base } from './layouts/Base.js'
import type { Post as PostData } from '../lib/posts.js'

type PostProps = {
  currentPath: string
  post: PostData
}

// Renders a blog post: title, author, publish date, and the post contents.
export function Post({ currentPath, post }: PostProps) {
  return (
    <Base
      title={post.title}
      currentPath={currentPath}
      description={post.description}
      keywords={post.keywords}
    >
      <article class='mx-auto max-w-2xl'>
        <h1 class='mb-2 text-3xl font-bold'>{post.title}</h1>
        <p class='mb-8 text-sm text-gray-500'>
          {post.author ? <span>{post.author}</span> : null}
          {post.author && post.date ? ' · ' : null}
          {post.date ? <time datetime={post.date}>{post.date}</time> : null}
        </p>
        <div class='space-y-4' dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </Base>
  )
}
