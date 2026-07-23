import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { parseEditorData } from "../../editorData.js";
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

// Plain-text preview of the post body: paragraph text with inline markup and
// footnote markers stripped. Legacy bodies are already plain text.
const postExcerpt = (body: string): string => {
  const data = parseEditorData(body);
  const paragraphs = data
    ? data.blocks.map(excerptBlockText).filter((text) => text.length > 0)
    : [body];

  let joined = "";
  for (const paragraph of paragraphs) {
    joined = joined.length > 0 ? `${joined} ${paragraph}` : paragraph;
    if (joined.length >= EXCERPT_MAX_LENGTH) {
      break;
    }
  }

  return joined
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\[\^[A-Za-z0-9_-]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, EXCERPT_MAX_LENGTH);
};

type PostListProps = {
  currentPage?: number;
  pageBasePath?: string;
  pageSize?: number;
  posts: readonly PostWithAuthor[];
};

export const PostList: FC<PostListProps> = ({
  currentPage = 1,
  pageBasePath = "/blog",
  pageSize = 5,
  posts,
}) => {
  const page = paginateNewest(posts, currentPage, pageSize);

  return (
    <section aria-label="Blog posts" class="mt-16 w-full">
      {page.items.length > 0
        ? (
          <ul class="flex w-full flex-col gap-16">
            {page.items.map((post) => {
              const href = `/blog/${post.slug}`;
              const excerpt = postExcerpt(post.body);
              return (
                <li class="w-full">
                  <article class="flex w-full flex-col">
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
                      <h2 class="font-sans text-4xl font-bold sm:text-6xl">
                        {post.title}
                      </h2>
                    </a>

                    <PostMeta post={post} />

                    {excerpt
                      ? (
                        <p class="mt-6 line-clamp-4 leading-relaxed">
                          {excerpt}
                        </p>
                      )
                      : null}
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
