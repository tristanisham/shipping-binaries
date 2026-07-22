import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import type { RoleWithUserCount } from "../models/role.js";
import type { User } from "../models/user.js";
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
  roles: readonly RoleWithUserCount[];
  users: readonly User[];
};

export const AdminHome: FC<AdminHomeProps> = ({ posts, roles, users }) => {
  const meta: LayoutMeta = {
    title: "Admin | Shipping Binaries",
    robots: "noindex",
  };
  const recent = posts.slice(0, 5);

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
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
          <CardContent class="flex flex-col gap-8">
            <section aria-labelledby="overview-posts-title">
              <div class={`mb-3 flex items-center justify-between border-b pb-2 ${panelDivider}`}>
                <h2 class="font-semibold" id="overview-posts-title">
                  Recent posts
                </h2>
                <a class="text-sm underline" href="/admin/posts">View all</a>
              </div>
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
            </section>

            <section aria-labelledby="overview-users-title">
              <div class={`mb-3 flex items-center justify-between border-b pb-2 ${panelDivider}`}>
                <h2 class="font-semibold" id="overview-users-title">Users</h2>
                <a class="text-sm underline" href="/admin/users">Manage</a>
              </div>
              <div class="overflow-x-auto">
                <table aria-label="Users" class="w-full text-left text-sm">
                  <thead class={`text-xs uppercase ${panelMuted}`}>
                    <tr>
                      <th class="pb-2 pr-4 font-medium">Label</th>
                      <th class="pb-2 pr-4 font-medium">Username</th>
                      <th class="pb-2 pr-4 font-medium">Email</th>
                      <th class="pb-2 pr-4 font-medium">Roles</th>
                      <th class="pb-2 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr class={`border-t ${panelDivider}`}>
                        <td class="py-3 pr-4">{user.label ?? "—"}</td>
                        <td class="py-3 pr-4">{user.username}</td>
                        <td class="py-3 pr-4">{user.email}</td>
                        <td class="py-3 pr-4">
                          {user.roles.length > 0 ? user.roles.join(", ") : "—"}
                        </td>
                        <td class="py-3 text-right">
                          <Badge variant={user.active ? "published" : "draft"}>
                            {user.active ? "Active" : "Deactivated"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="overview-roles-title">
              <div class={`mb-3 flex items-center justify-between border-b pb-2 ${panelDivider}`}>
                <h2 class="font-semibold" id="overview-roles-title">Roles</h2>
                <a class="text-sm underline" href="/admin/roles">Manage</a>
              </div>
              <div class="overflow-x-auto">
                <table aria-label="Roles" class="w-full text-left text-sm">
                  <thead class={`text-xs uppercase ${panelMuted}`}>
                    <tr>
                      <th class="pb-2 pr-4 font-medium">Role</th>
                      <th class="pb-2 text-right font-medium">Accounts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr class={`border-t ${panelDivider}`}>
                        <td class="py-3 pr-4">{role.name}</td>
                        <td class="py-3 text-right">{role.userCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
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
                Manage users ({users.length})
              </a>
            </div>
          </AdminToolSection>
          <AdminToolSection open title="Roles">
            <div class="flex flex-col gap-3">
              <a
                class={cn(
                  buttonVariants({ variant: "outline" }),
                  "w-full",
                  panelOutlineButton,
                )}
                href="/admin/roles"
              >
                Manage roles ({roles.length})
              </a>
            </div>
          </AdminToolSection>
        </AdminTools>
      </main>
    </Layout>
  );
};
