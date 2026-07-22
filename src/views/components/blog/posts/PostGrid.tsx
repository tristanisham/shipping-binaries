import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { paginateNewest, Pagination } from "./Pagination.js";
import { PostMeta } from "./PostMeta.js";

type PostGridProps = {
  currentPage?: number;
  pageBasePath?: string;
  pageSize?: number;
  posts: readonly PostWithAuthor[];
};

export const PostGrid: FC<PostGridProps> = ({
  currentPage = 1,
  pageBasePath = "/",
  pageSize = 12,
  posts,
}) => {
  const page = paginateNewest(posts, currentPage, pageSize);
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
                    <h2 class="font-sans text-4xl font-bold sm:text-8xl">
                      {featured.title}
                    </h2>
                  </a>
                  <PostMeta inverse post={featured} />
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
                      <PostMeta post={post} />
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
