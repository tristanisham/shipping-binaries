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
          <CardHeader class="border-b border-onyx-200 dark:border-onyx-700">
            <CardTitle class="text-2xl text-burgundy-700 dark:text-burgundy-300">
              Edit user
            </CardTitle>
            <CardDescription>
              Update account details for {user.username}.
            </CardDescription>
          </CardHeader>
          <form action={`/admin/users/${user.id}`} method="post">
            <CardContent class="flex flex-col gap-5 pt-6">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Email
                <Input name="email" type="email" value={user.email} />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Username
                <Input name="username" value={user.username} />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                New password
                <Input
                  autocomplete="new-password"
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
            <CardFooter class="justify-end gap-2 border-t border-onyx-200 pt-6 dark:border-onyx-700">
              <a
                class="text-sm text-onyx-600 underline dark:text-onyx-300"
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
