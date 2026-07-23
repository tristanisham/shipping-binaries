import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button, buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { cn } from "./components/ui/utils.js";
import {
  panelDivider,
  panelEmpty,
  panelMuted,
  panelOutlineButton,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminPostsProps = {
  posts: readonly PostListItem[];
};

const estDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
  month: "long",
  timeZone: "Etc/GMT+5",
  year: "numeric",
});

const formatUpdatedAt = (timestamp: string): string => {
  const normalizedTimestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const date = new Date(normalizedTimestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return `${estDateTimeFormatter.format(date).replace(" at ", " ")} EST`;
};

export const AdminPosts: FC<AdminPostsProps> = ({ posts }) => {
  const meta: LayoutMeta = {
    title: "Posts | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/posts" />

        <Card class="min-w-0">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Posts</CardTitle>
            <CardDescription>
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0
              ? (
                <div
                  class={`rounded-lg px-4 py-8 text-center text-sm ${panelEmpty}`}
                >
                  No posts yet.{" "}
                  <a class="underline" href="/admin/write">
                    Write one
                  </a>
                  .
                </div>
              )
              : (
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm">
                    <thead
                      class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}
                    >
                      <tr>
                        <th class="py-2 pr-4 font-medium">Title</th>
                        <th class="py-2 pr-4 font-medium">Author</th>
                        <th class="py-2 pr-4 font-medium">Status</th>
                        <th class="py-2 pr-4 font-medium">Updated</th>
                        <th class="py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr class="border-b border-amber-50/10 last:border-0 dark:border-mist-600/10">
                          <td class="max-w-xs py-3 pr-4 font-medium text-amber-50 dark:text-mist-600">
                            <a
                              class="group inline-flex items-center gap-1.5 hover:underline"
                              href={`/blog/${post.slug}`}
                            >
                              <span class="truncate">{post.title}</span>
                              <svg
                                aria-hidden="true"
                                class="size-4 shrink-0 fill-none stroke-current opacity-0 transition-opacity group-hover:opacity-100"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                viewBox="0 0 24 24"
                              >
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            </a>
                          </td>
                          <td class={`py-3 pr-4 ${panelMuted}`}>
                            {post.authorUsername}
                          </td>
                          <td class="py-3 pr-4">
                            <Badge variant={post.draft ? "draft" : "published"}>
                              {post.draft ? "Draft" : "Published"}
                            </Badge>
                          </td>
                          <td
                            class={`whitespace-nowrap py-3 pr-4 ${panelMuted}`}
                          >
                            <time dateTime={post.updatedAt}>
                              {formatUpdatedAt(post.updatedAt)}
                            </time>
                          </td>
                          <td class="py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                              <a
                                class={cn(
                                  buttonVariants({
                                    size: "sm",
                                    variant: "outline",
                                  }),
                                  panelOutlineButton,
                                )}
                                href={`/admin/write?id=${post.id}`}
                                aria-label={`Edit ${post.title}`}
                                title={`Edit ${post.title}`}
                              >
                                <svg
                                  aria-hidden="true"
                                  class="size-4 fill-none stroke-current"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  stroke-width="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </a>
                              <form
                                action={`/admin/posts/${post.id}/draft`}
                                method="post"
                              >
                                <input
                                  name="draft"
                                  type="hidden"
                                  value={post.draft ? "0" : "1"}
                                />
                                <Button
                                  aria-label={post.draft
                                    ? `Publish ${post.title}`
                                    : `Unpublish ${post.title}`}
                                  size="sm"
                                  title={post.draft
                                    ? `Publish ${post.title}`
                                    : `Unpublish ${post.title}`}
                                  type="submit"
                                  variant="primary"
                                >
                                  {post.draft
                                    ? (
                                      <svg
                                        aria-hidden="true"
                                        class="size-4 fill-none stroke-current"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="m15 6 2 2 4-4" />
                                        <path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10" />
                                      </svg>
                                    )
                                    : (
                                      <svg
                                        aria-hidden="true"
                                        class="size-4 fill-none stroke-current"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M10.114 4.462A14.5 14.5 0 0 1 12 2a10 10 0 0 1 9.313 13.643" />
                                        <path d="M15.557 15.556A14.5 14.5 0 0 1 12 22 10 10 0 0 1 4.929 4.929" />
                                        <path d="M15.892 10.234A14.5 14.5 0 0 0 12 2a10 10 0 0 0-3.643.687" />
                                        <path d="M17.656 12H22" />
                                        <path d="M19.071 19.071A10 10 0 0 1 12 22 14.5 14.5 0 0 1 8.44 8.45" />
                                        <path d="M2 12h10" />
                                        <path d="m2 2 20 20" />
                                      </svg>
                                    )}
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
