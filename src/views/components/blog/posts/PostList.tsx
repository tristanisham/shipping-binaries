import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { PostBody } from "../PostBody.js";
import { parseEditorData } from "../../editorData.js";
import { cn } from "../../ui/utils.js";
import { paginateNewest, Pagination } from "./Pagination.js";
import { PostMeta } from "./PostMeta.js";

const EXCERPT_MAX_LENGTH = 600;

type ExcerptBlock = {
  type?: string;
  data?: Record<string, unknown>;
};

const excerptBlockText = (block: unknown): string => {
  if (typeof block !== "object" || block === null) {
    return "";
  }

  const { data, type } = block as ExcerptBlock;
  return type === "paragraph" && typeof data?.text === "string"
    ? data.text
    : "";
};

const cleanExcerptText = (text: string): string =>
  text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\[\^[A-Za-z0-9_-]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Plain-text preview paragraphs with inline markup and footnote markers
// stripped. Legacy bodies are separated on blank lines where possible.
const postExcerptParagraphs = (body: string): string[] => {
  const data = parseEditorData(body);
  return (data
    ? data.blocks.map(excerptBlockText).filter((text) => text.length > 0)
    : body.split(/\n\s*\n/))
    .map(cleanExcerptText)
    .filter((text) => text.length > 0);
};

const postExcerpt = (body: string): string => {
  let joined = "";
  for (const paragraph of postExcerptParagraphs(body)) {
    joined = joined.length > 0 ? `${joined} ${paragraph}` : paragraph;
    if (joined.length >= EXCERPT_MAX_LENGTH) {
      break;
    }
  }

  return joined.slice(0, EXCERPT_MAX_LENGTH);
};

type PostListProps = {
  class?: string;
  currentPage?: number;
  isAdmin?: boolean;
  pageBasePath?: string;
  pageSize?: number;
  posts: readonly PostWithAuthor[];
  viewerUserId?: number | null;
};

export const PostList: FC<PostListProps> = ({
  class: className,
  currentPage = 1,
  isAdmin = false,
  pageBasePath = "/blog",
  pageSize = 5,
  posts,
  viewerUserId = null,
}) => {
  const page = paginateNewest(posts, currentPage, pageSize);
  const showFullBody = posts.length === 1;
  const showLongPreview = posts.length === 2;

  return (
    <section
      aria-label="Blog posts"
      class={cn("mx-auto mt-16 w-full max-w-[60rem]", className)}
    >
      {page.items.length > 0
        ? (
          <ul class="flex w-full flex-col gap-12">
            {page.items.map((post) => {
              const href = `/blog/${post.slug}`;
              const excerpt = postExcerpt(post.body);
              const previewParagraphs = showLongPreview
                ? postExcerptParagraphs(post.body).slice(0, 3)
                : [];
              return (
                <li class="w-full">
                  <article class="flex w-full flex-col rounded-b-2xl">
                    {post.image
                      ? (
                        <a class="mb-6 block" href={href}>
                          <img
                            alt=""
                            class="aspect-video w-full rounded-2xl object-cover object-left"
                            loading="lazy"
                            src={post.image}
                          />
                        </a>
                      )
                      : null}

                    <a class="w-fit hover:underline" href={href}>
                      <h2 class="font-sans text-3xl font-bold sm:text-4xl">
                        {post.title}
                      </h2>
                    </a>

                    <PostMeta
                      canEdit={isAdmin || viewerUserId === post.userId}
                      post={post}
                    />

                    {showFullBody
                      ? (
                        <div class="mt-6">
                          <PostBody body={post.body} />
                        </div>
                      )
                      : (
                        <>
                          {showLongPreview
                            ? (
                              previewParagraphs.length > 0
                                ? (
                                  <div class="mt-6 space-y-4 leading-relaxed">
                                    {previewParagraphs.map((paragraph) => (
                                      <p>{paragraph}</p>
                                    ))}
                                  </div>
                                )
                                : null
                            )
                            : excerpt
                            ? (
                              <p class="mt-6 line-clamp-4 leading-relaxed">
                                {excerpt}
                              </p>
                            )
                            : null}
                          <a
                            class="mt-4 block w-fit font-semibold text-chocolate-500 underline decoration-current underline-offset-2 hover:text-chocolate-400"
                            href={href}
                          >
                            Read more...
                          </a>
                        </>
                      )}
                  </article>
                </li>
              );
            })}
          </ul>
        )
        : <p>No posts have been published yet.</p>}
      <Pagination
        basePath={pageBasePath}
        currentPage={page.currentPage}
        totalPages={page.totalPages}
      />
    </section>
  );
};
