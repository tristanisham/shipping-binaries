import type { FC } from "hono/jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/Card.js";
import { panelDivider } from "./panel.js";

export type AdminNavItem = {
  label: string;
  link: string;
  description: string;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", link: "/admin", description: "Admin home" },
  { label: "Posts", link: "/admin/posts", description: "Manage posts" },
  { label: "Users", link: "/admin/users", description: "Manage users" },
  { label: "Write", link: "/admin/write", description: "New post" },
];

type AdminNavProps = {
  current: string;
};

export const AdminNav: FC<AdminNavProps> = ({ current }) => (
  <Card class="min-w-0 self-start">
    <CardHeader class={`border-b ${panelDivider}`}>
      <CardTitle class="text-xl">Manage</CardTitle>
    </CardHeader>
    <CardContent>
      <nav aria-label="Admin">
        <ul class="flex flex-col gap-2">
          {adminNavItems.map((item) => {
            const isCurrent = item.link === current;
            return (
              <li>
                <a
                  aria-current={isCurrent ? "page" : undefined}
                  class={
                    isCurrent
                      ? "block rounded-lg border border-amber-50/50 bg-amber-50/10 px-3 py-2 dark:border-mist-600/50 dark:bg-mist-600/10"
                      : "block rounded-lg border border-amber-50/20 px-3 py-2 transition-colors hover:border-amber-50/50 hover:bg-amber-50/5 dark:border-mist-600/20 dark:hover:border-mist-600/50 dark:hover:bg-mist-600/5"
                  }
                  href={item.link}
                >
                  <span class="block text-sm font-medium">{item.label}</span>
                  <span class="block text-xs text-amber-50/60 dark:text-mist-600/60">
                    {item.description}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </CardContent>
  </Card>
);
