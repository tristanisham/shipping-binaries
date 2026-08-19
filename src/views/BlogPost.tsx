import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import { Comment } from "./components/blog/Comment.js";
import { CommentEditor } from "./components/blog/CommentEditor.js";
import { PostEngagement } from "./components/analytics/PostEngagement.js";
import { getPostHeadings, PostBody } from "./components/blog/PostBody.js";
import { PostMeta } from "./components/blog/posts/PostMeta.js";
import { PostTableOfContents } from "./components/blog/PostTableOfContents.js";
import { toIsoTimestamp } from "./components/date.js";
import { defaultHeaderNav } from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { toAbsoluteUrl } from "./components/SocialMeta.js";
import { authorFeedLinks, blogFeedLinks } from "../feeds/feed.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type BlogPostProps = ViewerProps & {
  canComment?: boolean;
  isPreview?: boolean;
  post: PostWithAuthor;
};

export const BlogPost: FC<BlogPostProps> = ({
  canComment = false,
  isAdmin = false,
  isAuthenticated = false,
  isPreview = false,
  post,
  viewerUserId = null,
  viewerUsername = null,
}) => {
  const postUrl = toAbsoluteUrl(`/blog/${post.slug}`);
  const headings = getPostHeadings(post.body);
  const meta: LayoutMeta = {
    title: `${post.title} | Shipping Binaries`,
    description: post.description,
    keywords: post.keywords,
    canonical: isPreview ? undefined : postUrl,
    feeds: isPreview ? undefined : [
      ...blogFeedLinks(),
      ...authorFeedLinks(
        post.authorUsername,
        post.authorLabel ?? post.authorUsername,
      ),
    ],
    robots: isPreview ? "noindex, nofollow" : undefined,
    social: isPreview ? undefined : {
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
      <HeaderSlim
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={defaultHeaderNav}
        viewerUsername={viewerUsername}
      />
      <PostTableOfContents headings={headings} />
      <main
        class="container mx-auto max-w-3xl px-4 py-12"
        data-post-analytics={isPreview ? undefined : ""}
        data-post-preview={isPreview ? "" : undefined}
      >
        {isPreview
          ? (
            <aside
              class="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-chocolate-500 bg-chocolate-500/10 px-4 py-3"
              role="status"
            >
              <p>
                <strong>Private preview.</strong>{" "}
                Only your signed-in account can see this rendering.
              </p>
              <a
                class="font-semibold underline underline-offset-4"
                href={post.id > 0
                  ? `/admin/write?id=${post.id}`
                  : "/admin/write"}
              >
                Back to editor
              </a>
            </aside>
          )
          : null}
        <article>
          <header class="mb-8">
            <h1 class="text-4xl font-bold">{post.title}</h1>
            {post.description
              ? <p class="mt-3 text-lg opacity-75">{post.description}</p>
              : null}
            <PostMeta
              canEdit={!isPreview && (isAdmin || viewerUserId === post.userId)}
              post={post}
              showRead={false}
              showTextSize
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
          <div data-post-content>
            <PostBody
              body={post.body}
              headings={headings}
            />
          </div>
        </article>

        {!isPreview
          ? (
            <section
              aria-labelledby="comments-heading"
              class="mt-12 space-y-4"
              id="comments"
            >
              <h2 class="text-2xl font-bold" id="comments-heading">Comments</h2>
              {canComment
                ? (
                  <CommentEditor
                    action={`/blog/${post.slug}/comments`}
                    postSlug={post.slug}
                  />
                )
                : null}
              {post.comments.length > 0
                ? post.comments.map((comment) => (
                  <Comment
                    canReply={canComment}
                    comment={comment}
                    postSlug={post.slug}
                  />
                ))
                : <p>No comments yet.</p>}
            </section>
          )
          : null}

        {isPreview ? null : (
          <PostEngagement
            isAuthenticated={isAuthenticated}
            postId={post.id}
            postSlug={post.slug}
            postTitle={post.title}
          />
        )}
      </main>
    </Layout>
  );
};
