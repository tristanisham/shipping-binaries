import type { FC } from "hono/jsx";
import type { Post } from "../models/post.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type DashboardProps = {
  posts: readonly Post[];
};

export const Dashboard: FC<DashboardProps> = ({ posts }) => {
  const meta: LayoutMeta = {
    title: "Dashboard | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="grid min-h-[calc(100vh-5rem)] w-full grid-cols-[20%_60%_20%]">
        <aside class="border-r-2 border-mist-600/30 p-6 dark:border-amber-50/30">
          <h1 class="mb-6 text-2xl font-bold">Content</h1>
          {posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : (
            <ol class="flex flex-col gap-3">
              {posts.map((post) => (
                <li class="rounded-md border-2 border-mist-600/30 p-3 dark:border-amber-50/30">
                  <p class="font-bold">{post.title}</p>
                  <p class="text-sm">{post.draft ? "Draft" : "Published"}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>

        <section aria-labelledby="post-editor-heading" class="p-8">
          <h2 class="mb-6 text-3xl font-bold" id="post-editor-heading">
            Post editor
          </h2>
          <div class="flex min-h-[65vh] flex-col gap-5">
            <label class="flex flex-col gap-2 font-bold">
              Title
              <input
                class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                name="title"
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Description
              <textarea
                class="resize-y rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                name="description"
                rows={3}
              ></textarea>
            </label>
            <label class="flex grow flex-col gap-2 font-bold">
              Body
              <textarea
                class="grow resize-y rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                name="body"
              ></textarea>
            </label>
          </div>
        </section>

        <aside class="border-l-2 border-mist-600/30 p-6 dark:border-amber-50/30">
          <h2 class="mb-6 text-2xl font-bold">Tools</h2>
          <div class="flex flex-col gap-4">
            <section class="rounded-md border-2 border-mist-600/30 p-4 dark:border-amber-50/30">
              <h3 class="font-bold">Publishing</h3>
            </section>
            <section class="rounded-md border-2 border-mist-600/30 p-4 dark:border-amber-50/30">
              <h3 class="font-bold">Metadata</h3>
            </section>
            <section class="rounded-md border-2 border-mist-600/30 p-4 dark:border-amber-50/30">
              <h3 class="font-bold">Image</h3>
            </section>
          </div>
        </aside>
      </main>
    </Layout>
  );
};
