import type { FC } from "hono/jsx";
import type { Post } from "../models/post.js";
import { Comment } from "./components/blog/Comment.js";
import { PostBody } from "./components/blog/PostBody.js";
import { defaultHeaderNav, Header } from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type BlogPostProps = {
  isAuthenticated?: boolean;
  post: Post;
};

export const BlogPost: FC<BlogPostProps> = ({
  isAuthenticated = false,
  post,
}) => {
  const meta: LayoutMeta = {
    title: `${post.title} | Shipping Binaries`,
    description: post.description,
    keywords: post.keywords,
  };

  return (
    <Layout meta={meta}>
      <Header isAuthenticated={isAuthenticated} nav={defaultHeaderNav} />
      <main class="container mx-auto max-w-3xl px-4 py-12">
        <article>
          <header class="mb-8">
            <h1 class="text-4xl font-bold">{post.title}</h1>
            {post.description
              ? <p class="mt-3 text-lg opacity-75">{post.description}</p>
              : null}
          </header>
          {post.image
            ? (
              <img
                alt=""
                class="mb-8 aspect-video w-full rounded-xl object-cover"
                src={post.image}
              />
            )
            : null}
          <PostBody body={post.body} />
        </article>

        <section
          aria-labelledby="comments-heading"
          class="mt-12 space-y-4"
          id="comments"
        >
          <h2 class="text-2xl font-bold" id="comments-heading">Comments</h2>
          {post.comments.length > 0
            ? post.comments.map((comment) => <Comment comment={comment} />)
            : <p>No comments yet.</p>}
        </section>
      </main>
    </Layout>
  );
};
