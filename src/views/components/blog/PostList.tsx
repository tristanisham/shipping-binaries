import type { FC } from "hono/jsx";
import type { Post } from "../../../models/post.js";

type PostListProps = {
  posts: readonly Post[];
};

export const PostList: FC<PostListProps> = ({ posts }) => {
  return (
    <section aria-label="Blog posts">
      <ul class="space-y-6">
        {posts.map((post) => {
          const href = `/blog/${post.id}`;

          return (
            <li>
              <article class="flex gap-8 rounded-2xl border border-mist-600/20 bg-amber-50 p-10 text-mist-600 shadow-sm dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50">
                {post.image && (
                  <img
                    alt=""
                    class="h-40 w-56 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                    src={post.image}
                  />
                )}

                <div class="flex min-w-0 flex-1 flex-col">
                  <a class="w-fit hover:underline" href={href}>
                    <h2 class="text-2xl font-bold">{post.title}</h2>
                  </a>
                  <a class="mt-2 block min-w-0 hover:underline" href={href}>
                    <p class="truncate">{post.description}</p>
                  </a>

                  <div class="mt-auto flex items-center justify-end gap-3 pt-6">
                    <button
                      class="cursor-pointer rounded-lg border border-mist-600/30 px-4 py-2 font-semibold transition-colors hover:bg-mist-600 hover:text-amber-50 dark:border-amber-50/30 dark:hover:bg-amber-50 dark:hover:text-mist-600"
                      data-share-title={post.title}
                      data-share-url={href}
                      onclick={'const button = this; const url = new URL(button.dataset.shareUrl, window.location.origin).href; if (navigator.share) { void navigator.share({ title: button.dataset.shareTitle, url }); } else { void navigator.clipboard.writeText(url); }'}
                      type="button"
                    >
                      Share
                    </button>
                    <a
                      class="rounded-lg bg-mist-600 px-4 py-2 font-bold text-amber-50 transition-opacity hover:opacity-80 dark:bg-amber-50 dark:text-mist-600"
                      href={href}
                    >
                      Read
                    </a>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
