import type { FC } from "hono/jsx";
import type {
  User,
  UserSort,
  UserSortDirection,
} from "../models/user.js";
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
  CardAction,
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
  direction?: UserSortDirection;
  sort?: UserSort;
  users: readonly User[];
};

type SortableHeaderProps = {
  class?: string;
  currentDirection: UserSortDirection;
  currentSort?: UserSort;
  label: string;
  sort: UserSort;
};

const SortableHeader: FC<SortableHeaderProps> = ({
  class: className,
  currentDirection,
  currentSort,
  label,
  sort,
}) => {
  const active = currentSort === sort;
  const direction = active && currentDirection === "asc" ? "desc" : "asc";

  return (
    <th
      aria-sort={active
        ? currentDirection === "asc" ? "ascending" : "descending"
        : "none"}
      class={`py-2 pr-4 font-medium ${className ?? ""}`}
    >
      <a
        class="inline-flex items-center gap-1 hover:underline"
        href={`/admin/users?sort=${sort}&direction=${direction}`}
      >
        {label}
        <span aria-hidden="true" class="text-[0.65rem]">
          {active ? currentDirection === "asc" ? "↑" : "↓" : "↕"}
        </span>
      </a>
    </th>
  );
};

export const AdminUsers: FC<AdminUsersProps> = ({
  direction = "asc",
  sort,
  users,
}) => {
  const meta: LayoutMeta = {
    alpine: true,
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

        <Card
          class="min-w-0 w-full"
          {...{ "x-data": "{ addingUser: false }" }}
        >
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Users</CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"}
            </CardDescription>
            <CardAction>
              <Button
                aria-controls="new-user-row"
                aria-expanded="false"
                aria-label="Add user"
                class={panelOutlineButton}
                size="sm"
                title="Add user"
                type="button"
                variant="outline"
                {...{
                  "x-bind:aria-expanded": "addingUser.toString()",
                  "x-on:click":
                    "addingUser = !addingUser; if (addingUser) $nextTick(() => $refs.newUsername.focus())",
                }}
              >
                <svg
                  aria-hidden="true"
                  class="size-4 fill-none stroke-current"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="10" cy="7" r="4" />
                  <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
                  <path d="M21.4 16.6a1 1 0 0 0-3-3l-4 4a2 2 0 0 0-.5.9l-.9 2.9a.5.5 0 0 0 .6.6l2.9-.9a2 2 0 0 0 .9-.5Z" />
                </svg>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full table-fixed text-left text-sm">
                <thead
                  class={`border-b text-xs uppercase ${panelDivider} ${panelMuted}`}
                >
                  <tr>
                    <SortableHeader
                      class="w-1/5"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Label"
                      sort="label"
                    />
                    <SortableHeader
                      class="w-1/5"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Username"
                      sort="username"
                    />
                    <SortableHeader
                      class="w-1/4"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Email"
                      sort="email"
                    />
                    <SortableHeader
                      class="w-[10%]"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Status"
                      sort="status"
                    />
                    <th class="py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    class="border-b border-amber-50/10 dark:border-mist-600/10"
                    id="new-user-row"
                    style="display: none"
                    {...{ "x-show": "addingUser" }}
                  >
                    <td class="py-3 pr-4">
                      <form action="/admin/users" id="new-user-form" method="post">
                        <Input
                          aria-label="Label for new user"
                          class={panelField}
                          name="label"
                          placeholder="Display name"
                        />
                      </form>
                    </td>
                    <td class="py-3 pr-4">
                      <Input
                        aria-label="Username for new user"
                        class={panelField}
                        form="new-user-form"
                        name="username"
                        placeholder="Username"
                        required
                        {...{ "x-ref": "newUsername" }}
                      />
                    </td>
                    <td class="py-3 pr-4">
                      <Input
                        aria-label="Email for new user"
                        class={panelField}
                        form="new-user-form"
                        name="email"
                        placeholder="Email"
                        required
                        type="email"
                      />
                    </td>
                    <td class="py-3 pr-4">
                      <Badge variant="draft">Invitation</Badge>
                    </td>
                    <td class="py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <Button
                          aria-label="Send invitation"
                          class="!text-amber-50"
                          form="new-user-form"
                          size="sm"
                          title="Send invitation"
                          type="submit"
                          variant="secondary"
                        >
                          <svg
                            aria-hidden="true"
                            class="size-4 fill-none stroke-current"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            viewBox="0 0 24 24"
                          >
                            <rect height="16" rx="2" width="20" x="2" y="4" />
                            <path d="m22 7-10 6L2 7" />
                          </svg>
                        </Button>
                        <Button
                          class={panelOutlineButton}
                          size="sm"
                          type="button"
                          variant="outline"
                          {...{ "x-on:click": "addingUser = false" }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
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
                            aria-label={`Save ${user.username}`}
                            class="capitalize !text-amber-50"
                            form={`user-${user.id}-identity`}
                            size="sm"
                            title={`Save ${user.username}`}
                            type="submit"
                            variant="secondary"
                          >
                            <svg
                              aria-hidden="true"
                              class="size-4 fill-none stroke-current"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              viewBox="0 0 24 24"
                            >
                              <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                              <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                              <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                            </svg>
                          </Button>
                          {!user.active && (
                            <form
                              action={`/admin/users/${user.id}/invite`}
                              method="post"
                            >
                              <Button
                                aria-label={`Resend invitation to ${user.username}`}
                                class={panelOutlineButton}
                                size="sm"
                                title={`Resend invitation to ${user.username}`}
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
                                  <rect height="16" rx="2" width="20" x="2" y="4" />
                                  <path d="m22 7-10 6L2 7" />
                                </svg>
                              </Button>
                            </form>
                          )}
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
