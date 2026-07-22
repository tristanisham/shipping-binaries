import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { buttonVariants } from "./components/ui/Button.js";
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
  panelRow,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminHomeProps = {
  posts: readonly PostListItem[];
  userCount: number;
};

export const AdminHome: FC<AdminHomeProps> = ({ posts, userCount }) => {
  const meta: LayoutMeta = {
    title: "Admin | Shipping Binaries",
    robots: "noindex",
  };
  const recent = posts.slice(0, 5);

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin" />

        <Card class="min-w-0">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Overview</CardTitle>
            <CardDescription>Recent activity across the site.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            {recent.length === 0 ? (
              <div class={`rounded-lg px-4 py-8 text-center text-sm ${panelEmpty}`}>
                No posts yet.{" "}
                <a class="underline" href="/admin/write">
                  Write your first post
                </a>
                .
              </div>
            ) : (
              <ol class="flex flex-col gap-2">
                {recent.map((post) => (
                  <li class={`flex items-center justify-between gap-3 rounded-lg p-3 ${panelRow}`}>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium">{post.title}</p>
                      <p class={`truncate text-xs ${panelMuted}`}>
                        by {post.authorUsername}
                      </p>
                    </div>
                    <Badge variant={post.draft ? "draft" : "published"}>
                      {post.draft ? "Draft" : "Published"}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <aside class="flex min-w-0 flex-col gap-4">
          <h2 class="px-1 text-xl font-semibold text-burgundy-700 dark:text-burgundy-300">
            Quick links
          </h2>
          <Card class="gap-4 py-5">
            <CardContent class="flex flex-col gap-3 px-5">
              <a class={cn(buttonVariants(), "w-full")} href="/admin/write">
                New post
              </a>
              <a
                class={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full",
                  panelOutlineButton,
                )}
                href="/admin/posts"
              >
                Manage posts ({posts.length})
              </a>
              <a
                class={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full",
                  panelOutlineButton,
                )}
                href="/admin/users"
              >
                Manage users ({userCount})
              </a>
            </CardContent>
          </Card>
        </aside>
      </main>
    </Layout>
  );
};
