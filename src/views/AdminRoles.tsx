import type { FC } from "hono/jsx";
import { ADMIN_ROLE, type RoleWithUserCount } from "../models/role.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  panelDivider,
  panelField,
  panelMuted,
  panelOutlineButton,
} from "./components/admin/panel.js";
import { adminTagClass, TagCloud } from "./components/admin/TagCloud.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { SaveIcon } from "./components/icons/SaveIcon.js";
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
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminRolesProps = {
  error?: string;
  newRoleName?: string;
  roles: readonly RoleWithUserCount[];
};

export const AdminRoles: FC<AdminRolesProps> = ({
  error,
  newRoleName = "",
  roles,
}) => {
  const meta: LayoutMeta = {
    title: "Roles | Shipping Binaries",
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
        <AdminNav current="/admin/roles" />

        <Card class="min-w-0 w-full">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Roles</CardTitle>
            <CardDescription>
              Create the roles available on the Users page.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-6">
            <div class="flex flex-col gap-2 text-sm font-medium">
              <span>Current roles</span>
              <TagCloud aria-label="Current roles">
                {roles.map((role) => (
                  <a
                    aria-label={`Edit role ${role.name}`}
                    class={adminTagClass}
                    href={`#role-${role.id}`}
                  >
                    {role.name}
                  </a>
                ))}
              </TagCloud>
              <span class={`text-xs font-normal ${panelMuted}`}>
                Click on a role to edit it
              </span>
            </div>
            <form action="/admin/roles" class="flex items-end gap-3" method="post">
              <label class="flex grow flex-col gap-2 font-bold">
                Add role
                <Input
                  class={panelField}
                  autocapitalize="none"
                  maxlength={32}
                  name="name"
                  oninput="this.value = this.value.toLowerCase()"
                  pattern="[a-z](?:[a-z0-9]|-(?=[a-z0-9])){0,31}"
                  placeholder="editor"
                  required
                  value={newRoleName}
                />
              </label>
              <Button
                aria-label="Add role"
                class="!text-amber-50"
                type="submit"
                variant="tertiary"
              >
                <svg
                  aria-hidden="true"
                  class="size-4 fill-none stroke-current"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add role
              </Button>
            </form>
            <p class={`text-xs ${panelMuted}`}>
              Use lowercase letters, numbers, and single hyphens. The admin role
              cannot be renamed or deleted.
            </p>
            {error && (
              <p class="font-bold text-amber-300 dark:text-burgundy-700" role="alert">
                {error}
              </p>
            )}

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}>
                  <tr>
                    <th class="py-2 pr-4 font-medium">Role</th>
                    <th class="py-2 pr-4 font-medium">Accounts</th>
                    <th class="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const protectedRole = role.name === ADMIN_ROLE;
                    const formId = `role-${role.id}`;

                    return (
                      <tr
                        class={`border-b last:border-0 ${panelDivider}`}
                        id={`role-${role.id}`}
                      >
                        <td class="py-3 pr-4">
                          <form
                            action={`/admin/roles/${role.id}`}
                            id={formId}
                            method="post"
                          >
                            <Input
                              aria-label={`Name for ${role.name}`}
                              autocapitalize="none"
                              class={panelField}
                              disabled={protectedRole}
                              maxlength={32}
                              name="name"
                              oninput="this.value = this.value.toLowerCase()"
                              pattern="[a-z](?:[a-z0-9]|-(?=[a-z0-9])){0,31}"
                              required
                              value={role.name}
                            />
                          </form>
                        </td>
                        <td class="py-3 pr-4">
                          <Badge variant="draft">{role.userCount}</Badge>
                        </td>
                        <td class="py-3 text-right">
                          {protectedRole
                            ? <span class={panelMuted}>Protected</span>
                            : (
                              <div class="flex items-center justify-end gap-2">
                                <Button
                                  aria-label={`Save ${role.name}`}
                                  class="!text-amber-50"
                                  form={formId}
                                  size="sm"
                                  title={`Save ${role.name}`}
                                  type="submit"
                                  variant="tertiary"
                                >
                                  <SaveIcon />
                                </Button>
                                <form
                                  action={`/admin/roles/${role.id}/delete`}
                                  method="post"
                                >
                                  <Button
                                    aria-label={`Delete ${role.name}`}
                                    class={panelOutlineButton}
                                    size="sm"
                                    title={`Delete ${role.name}`}
                                    type="submit"
                                    variant="outline"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      class="size-4 fill-none stroke-current"
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M19 6l-1 15H6L5 6" />
                                      <path d="M10 11v6M14 11v6" />
                                    </svg>
                                  </Button>
                                </form>
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
