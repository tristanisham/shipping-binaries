import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import {
  panelDivider,
  panelField,
  panelMuted,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminUserEditProps = {
  user: User;
};

export const AdminUserEdit: FC<AdminUserEditProps> = ({ user }) => {
  const meta: LayoutMeta = {
    title: "Edit user | Shipping Binaries",
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

        <Card class="min-w-0 max-w-xl">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Edit user</CardTitle>
            <CardDescription>
              Update account details for {user.username}.
            </CardDescription>
          </CardHeader>
          <form action={`/admin/users/${user.id}`} method="post">
            <CardContent class="flex flex-col gap-5 pt-6">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Email
                <Input
                  class={panelField}
                  name="email"
                  type="email"
                  value={user.email}
                />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Username
                <Input
                  class={panelField}
                  name="username"
                  value={user.username}
                />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Name
                <Input
                  name="label"
                  placeholder="Optional display name"
                  value={user.label ?? ""}
                />
                <span class="text-xs font-normal text-onyx-500 dark:text-onyx-400">
                  Optional full name shown alongside the username.
                </span>
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Name
                <Input
                  name="label"
                  placeholder="Optional display name"
                  value={user.label ?? ""}
                />
                <span class="text-xs font-normal text-onyx-500 dark:text-onyx-400">
                  Optional full name shown alongside the username.
                </span>
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                New password
                <Input
                  autocomplete="new-password"
                  class={panelField}
                  name="password"
                  placeholder="Leave blank to keep current"
                  type="password"
                />
              </label>
              <label class="flex items-center gap-2 text-sm font-medium">
                <input
                  checked={user.active}
                  class="size-4"
                  name="active"
                  type="checkbox"
                  value="1"
                />
                Active
              </label>
            </CardContent>
            <CardFooter
              class={`justify-end gap-2 border-t pt-6 ${panelDivider}`}
            >
              <a
                class={`text-sm underline ${panelMuted}`}
                href="/admin/users"
              >
                Cancel
              </a>
              <Button type="submit">Save changes</Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </Layout>
  );
};
