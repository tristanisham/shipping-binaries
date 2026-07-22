import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import { AdminTools, AdminToolSection } from "./components/admin/AdminTools.js";
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
            {recent.length === 0
              ? (
                <div
                  class={`rounded-lg px-4 py-8 text-center text-sm ${panelEmpty}`}
                >
                  No posts yet.{" "}
                  <a class="underline" href="/admin/write">
                    Write your first post
                  </a>
                  .
                </div>
              )
              : (
                <ol class="flex flex-col gap-2">
                  {recent.map((post) => (
                    <li
                      class={`flex items-center justify-between gap-3 rounded-lg p-3 ${panelRow}`}
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{post.title}</p>
                        <p class={`truncate text-xs ${panelMuted}`}>
                          by {post.authorUsername}
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <a
                          class={cn(
                            buttonVariants({ size: "sm", variant: "outline" }),
                            panelOutlineButton,
                          )}
                          href={`/admin/write?id=${post.id}`}
                          aria-label={`Edit ${post.title}`}
                          title={`Edit ${post.title}`}
                        >
                          <svg
                            aria-hidden="true"
                            class="size-4"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </a>
                        <Badge variant={post.draft ? "draft" : "published"}>
                          {post.draft ? "Draft" : "Published"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
          </CardContent>
        </Card>

        <AdminTools title="Quick links">
          <AdminToolSection open title="Posts">
            <div class="flex flex-col gap-3">
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
            </div>
          </AdminToolSection>
          <AdminToolSection open title="Users">
            <div class="flex flex-col gap-3">
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
            </div>
          </AdminToolSection>
        </AdminTools>
      </main>
    </Layout>
  );
};
