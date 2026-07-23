import type { FC } from "hono/jsx";
import type { PermissionRecord } from "../models/permission.js";
import { isProtectedRole, type RoleWithUserCount } from "../models/role.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  panelDivider,
  panelField,
  panelMuted,
  panelOutlineButton,
  panelRow,
  panelText,
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
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminRolesProps = {
  error?: string;
  newPermissionName?: string;
  newRoleName?: string;
  permissionError?: string;
  permissions?: readonly PermissionRecord[];
  roles: readonly RoleWithUserCount[];
  selectedPermissionIds?: readonly number[];
  selectedRoleId?: number;
  viewerUsername?: string;
};

const permissionParts = (name: string): string[] =>
  name.split(/[.:]/).filter(Boolean);

const PermissionName: FC<{ name: string }> = ({ name }) => (
  <span class="flex min-w-0 flex-1 items-center font-mono text-xs">
    {permissionParts(name).map((part, index) => (
      <>
        {index > 0 && (
          <span aria-hidden="true" class={`px-2 ${panelMuted}`}>:</span>
        )}
        <span class="min-w-0 flex-1 truncate">{part}</span>
      </>
    ))}
  </span>
);

const CheckIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-check-icon lucide-check size-4 shrink-0"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const permissionManager = (
  assignedIds: readonly number[],
  permissions: readonly PermissionRecord[],
  roleId: number | null,
): string =>
  `{
  assigned: ${JSON.stringify(assignedIds)},
  busy: [],
  dragging: null,
  dragOver: false,
  error: "",
  permissionNames: ${JSON.stringify(permissions.map(({ name }) => name))},
  roleId: ${JSON.stringify(roleId)},
  query: "",
  has(id) {
    return this.assigned.includes(id);
  },
  isBusy(id) {
    return this.busy.includes(id);
  },
  matches(name) {
    const query = this.query.trim().toLowerCase().replace(/\\s*:\\s*/g, ":");
    return name.toLowerCase().includes(query);
  },
  hasMatches() {
    return this.permissionNames.some((name) => this.matches(name));
  },
  async save(id, assigned, action) {
    if (this.isBusy(id)) return;
    this.busy = [...this.busy, id];
    this.error = "";

    try {
      const response = await fetch(action, {
        method: "POST",
        body: new URLSearchParams({ assigned: assigned ? "1" : "0" }),
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("Permission update failed");
      this.assigned = assigned
        ? [...this.assigned, id]
        : this.assigned.filter((permissionId) => permissionId !== id);
    } catch {
      this.error = "That permission could not be updated.";
    } finally {
      this.busy = this.busy.filter((permissionId) => permissionId !== id);
    }
  },
  async toggle(id, form) {
    await this.save(id, !this.has(id), form.action);
  },
  startDrag(id, event) {
    this.dragging = id;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", String(id));
  },
  endDrag() {
    this.dragging = null;
    this.dragOver = false;
  },
  async dropPermission(event) {
    const id = Number.parseInt(
      event.dataTransfer.getData("text/plain") || String(this.dragging),
      10
    );
    this.dragOver = false;
    this.dragging = null;
    if (!Number.isInteger(id) || this.has(id) || !this.roleId) return;
    await this.save(
      id,
      true,
      "/admin/roles/" + this.roleId + "/permissions/" + id
    );
  }
}`;

export const AdminRoles: FC<AdminRolesProps> = ({
  error,
  newPermissionName = "",
  newRoleName = "",
  permissionError,
  permissions = [],
  roles,
  selectedPermissionIds = [],
  selectedRoleId,
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    alpine: true,
    title: "Roles | Shipping Binaries",
    robots: "noindex",
  };
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ??
    roles[0];
  const assignedIds = new Set(selectedPermissionIds);
  const protectedRole = selectedRole
    ? isProtectedRole(selectedRole.name)
    : false;

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/roles" />

        <Card class="min-w-0 w-full">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl">Roles</CardTitle>
            <CardDescription>
              Group permissions into roles and assign those roles on the Users
              page.
            </CardDescription>
          </CardHeader>
          <CardContent
            class="grid gap-6"
            {...{
              "x-data": permissionManager(
                selectedPermissionIds,
                permissions,
                selectedRole?.id ?? null,
              ),
            }}
          >
            <div class="flex flex-col gap-2 text-sm font-medium">
              <span>Current roles</span>
              <TagCloud aria-label="Current roles">
                {roles.map((role) => {
                  const selected = role.id === selectedRole?.id;

                  return (
                    <a
                      aria-current={selected ? "true" : undefined}
                      aria-label={`Select role ${role.name}`}
                      class={cn(
                        adminTagClass,
                        selected &&
                          "bg-amber-50/20 font-bold dark:bg-mist-600/20",
                      )}
                      href={`/admin/roles?role=${role.id}`}
                    >
                      {role.name}
                    </a>
                  );
                })}
              </TagCloud>
              <span class={`text-xs font-normal ${panelMuted}`}>
                Select a role to manage its permissions
              </span>
            </div>

            <form
              action="/admin/roles"
              class="flex items-end gap-3"
              method="post"
            >
              <label class="flex grow flex-col gap-2 font-bold">
                Add role
                <Input
                  autocapitalize="none"
                  class={panelField}
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
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Add role
              </Button>
            </form>
            <p class={`text-xs ${panelMuted}`}>
              Use lowercase letters, numbers, and single hyphens. The admin and
              guest roles cannot be renamed or deleted.
            </p>
            {error && (
              <p
                class="font-bold text-amber-300 dark:text-burgundy-700"
                role="alert"
              >
                {error}
              </p>
            )}

            {selectedRole
              ? (
                <div class="grid min-w-0 gap-4 lg:grid-cols-2">
                  <section
                    aria-labelledby="selected-role-heading"
                    class={`flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-xl border ${panelDivider}`}
                  >
                    <header
                      class={`flex items-center justify-between gap-3 border-b px-4 py-3 ${panelDivider}`}
                    >
                      <div>
                        <p class={`text-xs ${panelMuted}`}>Selected role</p>
                        <h2
                          class="font-bold"
                          id="selected-role-heading"
                        >
                          {selectedRole.name}
                        </h2>
                      </div>
                      <Badge variant="draft">
                        {selectedRole.userCount}{" "}
                        {selectedRole.userCount === 1 ? "account" : "accounts"}
                      </Badge>
                    </header>

                    <div
                      class="flex grow flex-col gap-3 p-4 transition-colors data-[drop-active=true]:bg-amber-50/10 dark:data-[drop-active=true]:bg-mist-600/10"
                      data-drop-active="false"
                      {...{
                        "x-bind:data-drop-active": "dragOver.toString()",
                        "x-on:dragenter.prevent": "dragOver = true",
                        "x-on:dragleave":
                          "if (!$el.contains($event.relatedTarget)) dragOver = false",
                        "x-on:dragover.prevent":
                          '$event.dataTransfer.dropEffect = "copy"',
                        "x-on:drop.prevent": "dropPermission($event)",
                      }}
                    >
                      <h3 class="text-sm font-bold">Assigned permissions</h3>
                      <TagCloud
                        aria-label={`Permissions assigned to ${selectedRole.name}`}
                        aria-live="polite"
                      >
                        {permissions.map((permission) => {
                          const assigned = assignedIds.has(permission.id);
                          const action =
                            `/admin/roles/${selectedRole.id}/permissions/${permission.id}`;

                          return (
                            <form
                              action={action}
                              method="post"
                              style={assigned ? undefined : "display: none"}
                              {...{
                                "x-on:submit.prevent":
                                  `toggle(${permission.id}, $el)`,
                                "x-show": `has(${permission.id})`,
                              }}
                            >
                              <input
                                name="assigned"
                                type="hidden"
                                value="0"
                              />
                              <button
                                aria-label={`Remove permission ${permission.name}`}
                                class={`${adminTagClass} disabled:opacity-50`}
                                type="submit"
                                {...{
                                  "x-bind:disabled": `isBusy(${permission.id})`,
                                }}
                              >
                                {permissionParts(permission.name).join(" : ")}
                              </button>
                            </form>
                          );
                        })}
                      </TagCloud>
                      <p
                        class={`text-sm ${panelMuted}`}
                        style={selectedPermissionIds.length === 0
                          ? undefined
                          : "display: none"}
                        {...{ "x-show": "assigned.length === 0" }}
                      >
                        No permissions assigned.
                      </p>
                    </div>

                    <footer
                      class={`border-t p-4 ${panelDivider}`}
                    >
                      {protectedRole
                        ? (
                          <div class="flex items-center justify-between gap-3">
                            <span class={`text-xs ${panelMuted}`}>
                              This role cannot be renamed or deleted.
                            </span>
                            <Badge variant="draft">Protected</Badge>
                          </div>
                        )
                        : (
                          <div class="grid gap-3">
                            <span class="text-sm font-bold">Role settings</span>
                            <div class="flex items-center gap-2">
                              <form
                                action={`/admin/roles/${selectedRole.id}`}
                                class="flex min-w-0 grow gap-2"
                                method="post"
                              >
                                <Input
                                  aria-label={`Name for ${selectedRole.name}`}
                                  autocapitalize="none"
                                  class={panelField}
                                  maxlength={32}
                                  name="name"
                                  oninput="this.value = this.value.toLowerCase()"
                                  pattern="[a-z](?:[a-z0-9]|-(?=[a-z0-9])){0,31}"
                                  required
                                  value={selectedRole.name}
                                />
                                <Button
                                  aria-label={`Save ${selectedRole.name}`}
                                  class="!text-amber-50"
                                  size="sm"
                                  title={`Save ${selectedRole.name}`}
                                  type="submit"
                                  variant="tertiary"
                                >
                                  <SaveIcon />
                                </Button>
                              </form>
                              <form
                                action={`/admin/roles/${selectedRole.id}/delete`}
                                method="post"
                              >
                                <Button
                                  aria-label={`Delete ${selectedRole.name}`}
                                  class={panelOutlineButton}
                                  size="sm"
                                  title={`Delete ${selectedRole.name}`}
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
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </Button>
                              </form>
                            </div>
                          </div>
                        )}
                    </footer>
                  </section>

                  <section
                    aria-labelledby="available-permissions-heading"
                    class={`flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-xl border ${panelDivider}`}
                  >
                    <header class={`border-b p-4 ${panelDivider}`}>
                      <h2
                        class="sr-only"
                        id="available-permissions-heading"
                      >
                        Available permissions
                      </h2>
                      <label class="relative block">
                        <span class="sr-only">Search permissions</span>
                        <Input
                          aria-label="Search permissions"
                          class={cn("pr-10", panelField)}
                          placeholder="Search permissions"
                          type="search"
                          {...{ "x-model": "query" }}
                        />
                        <svg
                          aria-hidden="true"
                          class={`pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 fill-none stroke-current ${panelMuted}`}
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </label>
                    </header>

                    <div class="grid grow content-start gap-2 overflow-y-auto bg-amber-50/10 p-4 dark:bg-mist-600/10">
                      {permissions.map((permission) => {
                        const assigned = assignedIds.has(permission.id);

                        return (
                          <form
                            action={`/admin/roles/${selectedRole.id}/permissions/${permission.id}`}
                            method="post"
                            {...{
                              "x-on:submit.prevent":
                                `toggle(${permission.id}, $el)`,
                              "x-show": `matches(${
                                JSON.stringify(permission.name)
                              })`,
                            }}
                          >
                            <input
                              name="assigned"
                              type="hidden"
                              value={assigned ? "0" : "1"}
                            />
                            <div
                              class={cn(
                                `flex w-full items-center rounded-lg border text-left transition-colors ${panelText} ${panelDivider}`,
                                "data-[selected=true]:border-chocolate-500 data-[selected=true]:bg-chocolate-500 data-[selected=true]:text-amber-50",
                              )}
                              data-selected={assigned ? "true" : "false"}
                              {...{
                                "x-bind:data-selected":
                                  `has(${permission.id}).toString()`,
                              }}
                            >
                              <span
                                aria-label={`Drag permission ${permission.name} to assigned permissions`}
                                class="ml-1 inline-flex cursor-grab touch-none items-center self-stretch px-2 opacity-60 hover:opacity-100 data-[dragging=true]:cursor-grabbing"
                                data-dragging="false"
                                draggable="true"
                                title={`Drag ${permission.name} to assigned permissions`}
                                {...{
                                  "x-bind:data-dragging":
                                    `dragging === ${permission.id} ? "true" : "false"`,
                                  "x-on:dragend": "endDrag()",
                                  "x-on:dragstart.stop":
                                    `startDrag(${permission.id}, $event)`,
                                }}
                              >
                                <svg
                                  aria-hidden="true"
                                  class="size-4 fill-current"
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="9" cy="7" r="1.5" />
                                  <circle cx="15" cy="7" r="1.5" />
                                  <circle cx="9" cy="12" r="1.5" />
                                  <circle cx="15" cy="12" r="1.5" />
                                  <circle cx="9" cy="17" r="1.5" />
                                  <circle cx="15" cy="17" r="1.5" />
                                </svg>
                              </span>
                              <button
                                aria-label={`Toggle permission ${permission.name}`}
                                aria-pressed={assigned ? "true" : "false"}
                                class="flex min-w-0 grow items-center gap-2 py-2 pr-3 text-left disabled:opacity-50"
                                type="submit"
                                {...{
                                  "x-bind:aria-pressed":
                                    `has(${permission.id}).toString()`,
                                  "x-bind:disabled":
                                    `isBusy(${permission.id})`,
                                }}
                              >
                                <PermissionName name={permission.name} />
                                <span
                                  aria-hidden="true"
                                  style={assigned
                                    ? undefined
                                    : "display: none"}
                                  {...{ "x-show": `has(${permission.id})` }}
                                >
                                  <CheckIcon />
                                </span>
                              </button>
                            </div>
                          </form>
                        );
                      })}
                      {permissions.length === 0 && (
                        <p class={`text-sm ${panelMuted}`}>
                          No permissions available.
                        </p>
                      )}
                      <p
                        class={`text-sm ${panelMuted}`}
                        style="display: none"
                        {...{
                          "x-show":
                            "query.trim() && !hasMatches()",
                        }}
                      >
                        No permissions match that search.
                      </p>
                    </div>

                    <footer
                      class={`mt-auto grid gap-2 border-t p-4 ${panelDivider}`}
                    >
                      <form
                        action={`/admin/roles/permissions?role=${selectedRole.id}`}
                        class="grid gap-2"
                        method="post"
                      >
                        <label class="text-sm font-bold" for="new-permission">
                          Add permission
                        </label>
                        <Input
                          autocapitalize="none"
                          class={panelField}
                          id="new-permission"
                          maxlength={96}
                          name="name"
                          oninput="this.value = this.value.toLowerCase()"
                          pattern="[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*(?::[a-z](?:[a-z0-9]|-(?=[a-z0-9]))*)+"
                          placeholder="posts:publish"
                          required
                          value={newPermissionName}
                        />
                        <Button
                          class="w-full"
                          type="submit"
                          variant="tertiary"
                        >
                          Add permission
                        </Button>
                      </form>
                      {permissionError && (
                        <p
                          class="text-sm font-bold text-amber-300 dark:text-burgundy-700"
                          role="alert"
                        >
                          {permissionError}
                        </p>
                      )}
                    </footer>
                  </section>
                </div>
              )
              : (
                <div class={`rounded-xl p-6 ${panelRow}`}>
                  Add a role to begin assigning permissions.
                </div>
              )}
            <p
              aria-live="polite"
              class="text-sm font-bold text-amber-300 dark:text-burgundy-700"
              role="status"
              {...{ "x-text": "error" }}
            />
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
