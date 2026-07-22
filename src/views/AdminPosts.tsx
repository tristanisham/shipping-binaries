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
  panelGhostButton,
  panelMuted,
  panelOutlineButton,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminPostsProps = {
  posts: readonly PostListItem[];
};

export const AdminPosts: FC<AdminPostsProps> = ({ posts }) => {
  const meta: LayoutMeta = {
    title: "Posts | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
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
            {posts.length === 0 ? (
              <div class={`rounded-lg px-4 py-8 text-center text-sm ${panelEmpty}`}>
                No posts yet.{" "}
                <a class="underline" href="/admin/write">
                  Write one
                </a>
                .
              </div>
            ) : (
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}>
                    <tr>
                      <th class="py-2 pr-4 font-medium">Title</th>
                      <th class="py-2 pr-4 font-medium">Author</th>
                      <th class="py-2 pr-4 font-medium">Status</th>
                      <th class="py-2 pr-4 font-medium">Updated</th>
                      <th class="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr class="border-b border-amber-50/10 last:border-0 dark:border-mist-600/10">
                        <td class="max-w-xs truncate py-3 pr-4 font-medium">
                          {post.title}
                        </td>
                        <td class={`py-3 pr-4 ${panelMuted}`}>
                          {post.authorUsername}
                        </td>
                        <td class="py-3 pr-4">
                          <Badge variant={post.draft ? "draft" : "published"}>
                            {post.draft ? "Draft" : "Published"}
                          </Badge>
                        </td>
                        <td class={`py-3 pr-4 ${panelMuted}`}>
                          {post.updatedAt}
                        </td>
                        <td class="py-3 pr-4">
                          <div class="flex items-center gap-2">
                            <a
                              class={cn(
                                buttonVariants({ size: "sm", variant: "outline" }),
                                panelOutlineButton,
                              )}
                              href={`/admin/write?id=${post.id}`}
                            >
                              Edit
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
                                class={panelGhostButton}
                                size="sm"
                                type="submit"
                                variant="ghost"
                              >
                                {post.draft ? "Publish" : "Unpublish"}
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
