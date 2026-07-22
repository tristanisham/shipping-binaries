import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
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
  panelGhostButton,
  panelMuted,
  panelOutlineButton,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminUsersProps = {
  users: readonly User[];
};

export const AdminUsers: FC<AdminUsersProps> = ({ users }) => {
  const meta: LayoutMeta = {
    title: "Users | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/users" />

        <Card class="min-w-0">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Users</CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead
                  class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}
                >
                  <tr>
                    <th class="py-2 pr-4 font-medium">Username</th>
                    <th class="py-2 pr-4 font-medium">Email</th>
                    <th class="py-2 pr-4 font-medium">Status</th>
                    <th class="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr class="border-b border-amber-50/10 last:border-0 dark:border-mist-600/10">
                      <td class="py-3 pr-4 font-medium">
                        {user.username}
                        {user.label
                          ? (
                            <span
                              class={`block text-xs font-normal ${panelMuted}`}
                            >
                              {user.label}
                            </span>
                          )
                          : null}
                      </td>
                      <td class={`py-3 pr-4 ${panelMuted}`}>
                        {user.email}
                      </td>
                      <td class="py-3 pr-4">
                        <Badge variant={user.active ? "published" : "draft"}>
                          {user.active ? "Active" : "Deactivated"}
                        </Badge>
                      </td>
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <a
                            class={cn(
                              buttonVariants({
                                size: "sm",
                                variant: "outline",
                              }),
                              panelOutlineButton,
                            )}
                            href={`/admin/users/${user.id}/edit`}
                          >
                            Edit
                          </a>
                          <form
                            action={`/admin/users/${user.id}/active`}
                            method="post"
                          >
                            <input
                              name="active"
                              type="hidden"
                              value={user.active ? "0" : "1"}
                            />
                            <Button
                              class={panelGhostButton}
                              size="sm"
                              type="submit"
                              variant="ghost"
                            >
                              {user.active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
