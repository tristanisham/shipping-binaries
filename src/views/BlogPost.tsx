import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import { Comment } from "./components/blog/Comment.js";
import {
  getPostHeadings,
  PostBody,
} from "./components/blog/PostBody.js";
import { PostMeta } from "./components/blog/posts/PostMeta.js";
import { PostTableOfContents } from "./components/blog/PostTableOfContents.js";
import { defaultHeaderNav, Header } from "./components/header/Header.js";
import { toAbsoluteUrl, toIsoTimestamp } from "./components/SocialMeta.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type BlogPostProps = ViewerProps & {
  post: PostWithAuthor;
};

export const BlogPost: FC<BlogPostProps> = ({
  isAdmin = false,
  isAuthenticated = false,
  post,
  viewerUserId = null,
}) => {
  const postUrl = toAbsoluteUrl(`/blog/${post.slug}`);
  const headings = getPostHeadings(post.body);
  const meta: LayoutMeta = {
    title: `${post.title} | Shipping Binaries`,
    description: post.description,
    keywords: post.keywords,
    canonical: postUrl,
    social: {
      title: post.title,
      type: "article",
      url: postUrl,
      image: post.image ? toAbsoluteUrl(post.image) : undefined,
      imageAlt: post.image ? post.title : undefined,
      author: post.authorLabel ?? post.authorUsername,
      publishedTime: toIsoTimestamp(post.createdAt),
      modifiedTime: toIsoTimestamp(post.updatedAt),
    },
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={defaultHeaderNav}
      />
      <PostTableOfContents headings={headings} />
      <main class="container mx-auto max-w-3xl px-4 py-12">
        <article>
          <header class="mb-8">
            <h1 class="text-4xl font-bold">{post.title}</h1>
            {post.description
              ? <p class="mt-3 text-lg opacity-75">{post.description}</p>
              : null}
            <PostMeta
              canEdit={isAdmin || viewerUserId === post.userId}
              post={post}
              showRead={false}
            />
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
          <PostBody body={post.body} headings={headings} />
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
