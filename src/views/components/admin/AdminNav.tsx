import type { FC } from "hono/jsx";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/Card.js";
import { Button } from "../ui/Button.js";
import { panelDivider, panelOutlineButton } from "./panel.js";

export type AdminNavItem = {
  label: string;
  link: string;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", link: "/admin" },
  { label: "Posts", link: "/admin/posts" },
  { label: "Users", link: "/admin/users" },
  { label: "Roles", link: "/admin/roles" },
  { label: "Write", link: "/admin/write" },
];

type AdminNavProps = {
  current: string;
};

const toggleAdminNav = `
  const card = this.closest("[data-admin-nav]");
  const content = card?.querySelector("[data-admin-nav-content]");
  const manageLabel = card?.querySelector("[data-admin-nav-manage-label]");
  const viewLabel = card?.querySelector("[data-admin-nav-view-label]");
  const closeIcon = this.querySelector("[data-admin-nav-close-icon]");
  const openIcon = this.querySelector("[data-admin-nav-open-icon]");
  if (!content || !manageLabel || !viewLabel || !closeIcon || !openIcon) return;

  const expanded = this.getAttribute("aria-expanded") === "true";
  content.classList.toggle("hidden", expanded);
  manageLabel.classList.toggle("hidden", expanded);
  viewLabel.classList.toggle("hidden", !expanded);
  closeIcon.classList.toggle("hidden", expanded);
  openIcon.classList.toggle("hidden", !expanded);
  this.setAttribute("aria-expanded", (!expanded).toString());
  this.setAttribute("aria-label", expanded ? "Open Manage" : "Close Manage");
  this.setAttribute("title", expanded ? "Open Manage" : "Close Manage");
`;

export const AdminNav: FC<AdminNavProps> = ({ current }) => {
  const currentLabel = adminNavItems.find((item) => item.link === current)
    ?.label ?? "Manage";

  return (
    <Card class="min-w-0 self-start" data-admin-nav>
      <CardHeader class={`border-b ${panelDivider}`}>
        <CardTitle class="text-xl">
          <span class="lg:inline" data-admin-nav-manage-label>Manage</span>
          <span class="hidden lg:hidden" data-admin-nav-view-label>
            {currentLabel}
          </span>
        </CardTitle>
        <CardAction class="lg:hidden">
          <Button
            aria-controls="admin-navigation"
            aria-expanded="true"
            aria-label="Close Manage"
            class={panelOutlineButton}
            onclick={toggleAdminNav}
            size="sm"
            title="Close Manage"
            type="button"
            variant="outline"
          >
            <svg
              aria-hidden="true"
              class="lucide lucide-chevron-up-icon lucide-chevron-up size-4 fill-none stroke-current"
              data-admin-nav-close-icon
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            <svg
              aria-hidden="true"
              class="lucide lucide-chevron-down-icon lucide-chevron-down hidden size-4 fill-none stroke-current"
              data-admin-nav-open-icon
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent id="admin-navigation" class="lg:block" data-admin-nav-content>
        <nav aria-label="Admin">
          <ul class="flex flex-col gap-3">
            {adminNavItems.map((item) => {
              const isCurrent = item.link === current;
              return (
                <li>
                  <a
                    aria-current={isCurrent ? "page" : undefined}
                    class={isCurrent
                      ? "block font-semibold underline underline-offset-4"
                      : "block hover:underline hover:underline-offset-4"}
                    href={item.link}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </CardContent>
    </Card>
  );
};
