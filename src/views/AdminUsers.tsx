import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import {
  panelDivider,
  panelField,
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

        <Card class="min-w-0 w-full">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Users</CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full table-fixed text-left text-sm">
                <thead
                  class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}
                >
                  <tr>
                    <th class="w-1/5 py-2 pr-4 font-medium">Label</th>
                    <th class="w-1/5 py-2 pr-4 font-medium">Username</th>
                    <th class="w-1/4 py-2 pr-4 font-medium">Email</th>
                    <th class="w-[10%] py-2 pr-4 font-medium">Status</th>
                    <th class="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr class="border-b border-amber-50/10 last:border-0 dark:border-mist-600/10">
                      <td class="py-3 pr-4">
                        <form
                          action={`/admin/users/${user.id}`}
                          id={`user-${user.id}-identity`}
                          method="post"
                        >
                          <Input
                            aria-label={`Label for ${user.username}`}
                            class={panelField}
                            name="label"
                            placeholder="Display name"
                            value={user.label ?? ""}
                          />
                        </form>
                      </td>
                      <td class="py-3 pr-4 text-amber-50 dark:text-mist-600">
                        <Input
                          aria-label={`Username for ${user.username}`}
                          class={panelField}
                          form={`user-${user.id}-identity`}
                          name="username"
                          required
                          value={user.username}
                        />
                      </td>
                      <td class="py-3 pr-4">
                        <Input
                          aria-label={`Email for ${user.username}`}
                          class={panelField}
                          form={`user-${user.id}-identity`}
                          name="email"
                          required
                          type="email"
                          value={user.email}
                        />
                      </td>
                      <td class="py-3 pr-4">
                        <Badge variant={user.active ? "published" : "draft"}>
                          {user.active ? "Active" : "Deactivated"}
                        </Badge>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <Button
                            class="capitalize !text-amber-50"
                            form={`user-${user.id}-identity`}
                            size="sm"
                            type="submit"
                            variant="secondary"
                          >
                            Save
                          </Button>
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
                              class={panelOutlineButton}
                              size="sm"
                              type="submit"
                              variant="outline"
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
