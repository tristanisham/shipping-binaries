import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { formatPublishDate, paginate, Pagination } from "./Pagination.js";

type PostGridProps = {
  currentPage?: number;
  pageBasePath?: string;
  pageSize?: number;
  posts: readonly PostWithAuthor[];
};

const AuthorAndDate: FC<{ post: PostWithAuthor; inverse?: boolean }> = ({
  post,
  inverse = false,
}) => (
  <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
    <a
      class="font-semibold hover:underline"
      href={`/@${encodeURIComponent(post.authorUsername)}`}
    >
      {post.authorLabel ?? post.authorUsername}
      <span class={inverse ? "ml-2 opacity-80" : "ml-2 opacity-60"}>
        @{post.authorUsername}
      </span>
    </a>
    <span aria-hidden="true" class="opacity-50">•</span>
    <time
      class={inverse ? "opacity-80" : "opacity-70"}
      datetime={post.createdAt}
    >
      Published {formatPublishDate(post.createdAt)}
    </time>
  </div>
);

export const PostGrid: FC<PostGridProps> = ({
  currentPage = 1,
  pageBasePath = "/",
  pageSize = 12,
  posts,
}) => {
  const newestFirst = [...posts].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const page = paginate(newestFirst, currentPage, pageSize);
  const [featured, ...remaining] = page.items;

  return (
    <section aria-label="Blog posts" class="mt-16 w-full">
      {featured
        ? (
          <ul class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <li class="md:col-span-3">
              <article class="relative flex min-h-96 overflow-hidden rounded-2xl border border-mist-600/20 bg-mist-600 text-amber-50 shadow-sm dark:border-amber-50/20">
                {featured.image
                  ? (
                    <img
                      alt=""
                      class="absolute inset-0 size-full object-cover object-left"
                      loading="eager"
                      src={featured.image}
                    />
                  )
                  : null}
                <div class="absolute inset-0 bg-gradient-to-t from-onyx-950/90 via-onyx-950/45 to-transparent" />
                <div class="relative mt-auto p-8 sm:p-12">
                  <a class="hover:underline" href={`/blog/${featured.slug}`}>
                    <h2 class="font-black-ops-one text-4xl sm:text-6xl">
                      {featured.title}
                    </h2>
                  </a>
                  <AuthorAndDate inverse post={featured} />
                </div>
              </article>
            </li>

            {remaining.map((post) => {
              const href = `/blog/${post.slug}`;
              return (
                <li>
                  <article class="flex h-full min-h-48 overflow-hidden rounded-2xl border border-mist-600/20 bg-amber-50 text-mist-600 shadow-sm dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50">
                    {post.image
                      ? (
                        <a class="w-2/5 shrink-0" href={href}>
                          <img
                            alt=""
                            class="size-full object-cover object-left"
                            loading="lazy"
                            src={post.image}
                          />
                        </a>
                      )
                      : null}
                    <div class="flex min-w-0 grow flex-col justify-center p-6">
                      <a class="hover:underline" href={href}>
                        <h2 class="font-black-ops-one text-2xl">
                          {post.title}
                        </h2>
                      </a>
                      <AuthorAndDate post={post} />
                    </div>
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
