import type { FC } from "hono/jsx";
import type { User, UserSort, UserSortDirection } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { CirclePlusIcon } from "./components/icons/CirclePlusIcon.js";
import {
  SaveCheckIcon,
  SaveIcon,
  SaveXIcon,
} from "./components/icons/SaveIcon.js";
import { UserPenIcon } from "./components/icons/UserPenIcon.js";
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
  viewerUsername?: string;
};

const saveUserInline = `
  saveState = "saving";
  window.clearTimeout(resetTimer);
  fetch($event.target.action, {
    method: "POST",
    body: new FormData($event.target),
    headers: { Accept: "application/json" }
  })
    .then((response) => {
      if (!response.ok) throw new Error("Save failed");
      saveState = "saved";
    })
    .catch(() => { saveState = "error"; })
    .finally(() => {
      resetTimer = window.setTimeout(() => { saveState = "idle"; }, 1600);
    });
`;

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
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    alpine: true,
    title: "Users | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,4fr)]">
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
                <CirclePlusIcon />
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
                      class="w-[15%]"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Label"
                      sort="label"
                    />
                    <SortableHeader
                      class="w-[15%]"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Username"
                      sort="username"
                    />
                    <SortableHeader
                      class="w-1/5"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Email"
                      sort="email"
                    />
                    <SortableHeader
                      class="w-[9%]"
                      currentDirection={direction}
                      currentSort={sort}
                      label="Status"
                      sort="status"
                    />
                    <th class="w-1/5 py-2 pr-4 font-medium">Roles</th>
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
                      <form
                        action="/admin/users"
                        id="new-user-form"
                        method="post"
                      >
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
                    <td class="py-3 pr-4" />
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
                    <tr
                      class="border-b border-amber-50/10 last:border-0 dark:border-mist-600/10"
                      {...{
                        "x-data":
                          "{ saveState: 'idle', resetTimer: undefined }",
                      }}
                    >
                      <td class="py-3 pr-4">
                        <form
                          action={`/admin/users/${user.id}`}
                          id={`user-${user.id}-identity`}
                          method="post"
                          {...{ "x-on:submit.prevent": saveUserInline }}
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
                      <td class="py-3 pr-4">
                        <div class="flex flex-wrap gap-1">
                          {user.roles.length === 0
                            ? <span class={panelMuted}>No roles</span>
                            : user.roles.map((role) => (
                              <Badge variant="outline">{role}</Badge>
                            ))}
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <a
                            aria-label={`Manage access for ${user.username}`}
                            class={panelOutlineButton}
                            href={`/admin/users/${user.id}/permissions`}
                            title={`Manage access for ${user.username}`}
                          >
                            <UserPenIcon />
                          </a>
                          <Button
                            aria-label={`Save ${user.username}`}
                            class="capitalize disabled:opacity-100"
                            form={`user-${user.id}-identity`}
                            size="sm"
                            title={`Save ${user.username}`}
                            type="submit"
                            variant="primary"
                            {...{
                              "x-bind:aria-busy":
                                "(saveState === 'saving').toString()",
                              "x-bind:aria-label":
                                `saveState === 'saved' ? 'Saved ${user.username}' : saveState === 'error' ? 'Could not save ${user.username}' : 'Save ${user.username}'`,
                              "x-bind:class":
                                "saveState !== 'idle' ? '!bg-chocolate-500 !text-amber-50' : ''",
                              "x-bind:data-variant":
                                "saveState === 'idle' ? 'primary' : 'tertiary'",
                              "x-bind:disabled": "saveState === 'saving'",
                              "x-bind:title":
                                `saveState === 'saved' ? 'Saved ${user.username}' : saveState === 'error' ? 'Could not save ${user.username}' : 'Save ${user.username}'`,
                            }}
                          >
                            <span
                              class="contents"
                              data-save-icon="save"
                              {...{
                                "x-show":
                                  "saveState === 'idle' || saveState === 'saving'",
                              }}
                            >
                              <SaveIcon />
                            </span>
                            <span
                              class="contents"
                              data-save-icon="check"
                              style="display: none"
                              {...{ "x-show": "saveState === 'saved'" }}
                            >
                              <SaveCheckIcon />
                            </span>
                            <span
                              class="contents"
                              data-save-icon="error"
                              style="display: none"
                              {...{ "x-show": "saveState === 'error'" }}
                            >
                              <SaveXIcon />
                            </span>
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
                                  <rect
                                    height="16"
                                    rx="2"
                                    width="20"
                                    x="2"
                                    y="4"
                                  />
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
                              aria-label={user.active
                                ? `Deactivate ${user.username}`
                                : `Activate ${user.username}`}
                              class={user.active
                                ? undefined
                                : panelOutlineButton}
                              size="sm"
                              title={user.active
                                ? `Deactivate ${user.username}`
                                : `Activate ${user.username}`}
                              type="submit"
                              variant={user.active ? "danger" : "outline"}
                            >
                              {user.active
                                ? (
                                  <svg
                                    aria-hidden="true"
                                    class="size-4 fill-none stroke-current"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2a8 8 0 0 0-5 14.2V20h10v-3.8A8 8 0 0 0 12 2Z" />
                                    <circle cx="9" cy="10" r="1" />
                                    <circle cx="15" cy="10" r="1" />
                                    <path d="m10 14 2-1 2 1" />
                                    <path d="M9 20v2M12 20v2M15 20v2" />
                                  </svg>
                                )
                                : "Activate"}
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
