import type { FC } from "hono/jsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/Card.js";

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
  <Card class="min-w-0 self-start border-chocolate-500/50 bg-linear-to-b from-onyx-900 to-onyx-950 text-onyx-50 dark:border-chocolate-400/50">
    <CardHeader class="border-b border-onyx-700">
      <CardTitle class="text-xl text-chocolate-300">Manage</CardTitle>
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
                      ? "block rounded-lg border border-chocolate-400 bg-onyx-900/70 px-3 py-2"
                      : "block rounded-lg border border-onyx-700 bg-onyx-900/70 px-3 py-2 transition-colors hover:border-chocolate-400"
                  }
                  href={item.link}
                >
                  <span class="block text-sm font-medium">{item.label}</span>
                  <span class="block text-xs text-onyx-300">
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
