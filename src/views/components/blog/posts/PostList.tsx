import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { paginateNewest, Pagination } from "./Pagination.js";
import { PostMeta } from "./PostMeta.js";

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
          <ul class="flex w-full flex-col gap-10">
            {page.items.map((post) => {
              const href = `/blog/${post.slug}`;
              return (
                <li class="w-full">
                  <article class="flex w-full flex-col rounded-2xl border border-mist-600/20 bg-amber-50 p-8 text-mist-600 shadow-sm dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50 sm:p-10">
                    <a class="w-fit hover:underline" href={href}>
                      <h2 class="font-sans text-4xl font-bold sm:text-6xl">
                        {post.title}
                      </h2>
                    </a>

                    <PostMeta post={post} />

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
