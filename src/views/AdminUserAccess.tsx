import type { FC } from "hono/jsx";
import {
  INDEFINITE_DENIAL_EXPIRES_AT,
  type PermissionRecord,
  type UserPermissionDenial,
} from "../models/permission.js";
import type { Role } from "../models/role.js";
import type { User } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import { panelMuted, panelText } from "./components/admin/panel.js";
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
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

const DURATIONS = [
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "Indefinite", value: "indefinite" },
];

type AdminUserAccessProps = {
  denials: readonly UserPermissionDenial[];
  permissions: readonly PermissionRecord[];
  roles: readonly Role[];
  user: User;
  viewerUsername?: string;
};

export const AdminUserAccess: FC<AdminUserAccessProps> = ({
  denials,
  permissions,
  roles,
  user,
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    title: `Access · ${user.username} | Shipping Binaries`,
    robots: "noindex",
  };
  const denialByPermission = new Map(
    denials.map((d) => [d.permissionId, d.expiresAt]),
  );

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/users" />
        <div class="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-2xl">Roles · {user.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={`/admin/users/${user.id}/roles`} method="post">
                <div class="flex flex-wrap gap-x-3 gap-y-2">
                  {roles.map((role) => (
                    <label class="inline-flex items-center gap-1.5">
                      <input
                        checked={user.roles.includes(role.name)}
                        class="size-4 accent-chocolate-500"
                        name="roleIds"
                        type="checkbox"
                        value={role.id}
                      />
                      <span class={panelText}>{role.name}</span>
                    </label>
                  ))}
                </div>
                <div class="mt-4">
                  <Button size="sm" type="submit" variant="primary">
                    Save roles
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-2xl">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-3">
                {permissions.map((permission) => {
                  const expiresAt = denialByPermission.get(permission.id);
                  return (
                    <li class="flex flex-wrap items-center justify-between gap-2">
                      <span class="flex items-center gap-2">
                        <code>{permission.name}</code>
                        {expiresAt
                          ? (
                            <Badge variant="draft">
                              {expiresAt === INDEFINITE_DENIAL_EXPIRES_AT
                                ? "Denied"
                                : `Snoozed until ${expiresAt}`}
                            </Badge>
                          )
                          : <Badge variant="published">Active</Badge>}
                      </span>
                      <span class="flex items-center gap-2">
                        <form
                          action={`/admin/users/${user.id}/denials`}
                          class="flex items-center gap-2"
                          method="post"
                        >
                          <input
                            name="permissionId"
                            type="hidden"
                            value={permission.id}
                          />
                          <select class={panelText} name="duration">
                            {DURATIONS.map((d) => (
                              <option value={d.value}>{d.label}</option>
                            ))}
                          </select>
                          <Button size="sm" type="submit" variant="outline">
                            Deny
                          </Button>
                        </form>
                        {expiresAt && (
                          <form
                            action={`/admin/users/${user.id}/denials/${permission.id}/delete`}
                            method="post"
                          >
                            <Button size="sm" type="submit" variant="outline">
                              Clear
                            </Button>
                          </form>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {permissions.length === 0 && (
                <p class={panelMuted}>
                  This user's roles grant no permissions.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
};
