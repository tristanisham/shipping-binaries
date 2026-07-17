import { Base } from './layouts/Base.js'

type PostProps = {
  currentPath: string
  post: {
    title: string
    date: string
    html: string
  }
}

export function Post({ currentPath, post }: PostProps) {
  return (
    <Base title={post.title} currentPath={currentPath}>
      <article>
        <h1 class='mb-2 text-3xl font-bold'>{post.title}</h1>
        {post.date ? <p class='mb-6 text-sm text-gray-500'>{post.date}</p> : null}
        <div class='space-y-4' dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    </Base>
  )
}
