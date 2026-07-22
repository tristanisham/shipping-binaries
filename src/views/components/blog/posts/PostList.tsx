import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { formatPublishDate, paginate, Pagination } from "./Pagination.js";

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
  const newestFirst = [...posts].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const page = paginate(newestFirst, currentPage, pageSize);

  return (
    <section aria-label="Blog posts" class="mt-16 w-full">
      {page.items.length > 0
        ? (
          <ul class="flex w-full flex-col gap-10">
            {page.items.map((post) => {
              const href = `/blog/${post.slug}`;
              const authorHref = `/@${encodeURIComponent(post.authorUsername)}`;

              return (
                <li class="w-full">
                  <article class="flex w-full flex-col rounded-2xl border border-mist-600/20 bg-amber-50 p-8 text-mist-600 shadow-sm dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50 sm:p-10">
                    <a class="w-fit hover:underline" href={href}>
                      <h2 class="font-black-ops-one text-4xl sm:text-6xl">
                        {post.title}
                      </h2>
                    </a>

                    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm">
                      <a
                        class="font-semibold hover:underline"
                        href={authorHref}
                      >
                        {post.authorLabel ?? `@${post.authorUsername}`}
                      </a>
                      <span aria-hidden="true" class="opacity-50">•</span>
                      <time class="opacity-70" datetime={post.createdAt}>
                        Published {formatPublishDate(post.createdAt)}
                      </time>
                    </div>

                    {post.image
                      ? (
                        <a class="mt-6 block" href={href}>
                          <img
                            alt=""
                            class="aspect-video w-full rounded-xl object-cover object-left"
                            loading="lazy"
                            src={post.image}
                          />
                        </a>
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
