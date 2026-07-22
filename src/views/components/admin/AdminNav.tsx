import type { FC } from "hono/jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.js";
import { panelDivider } from "./panel.js";

export type AdminNavItem = {
  label: string;
  link: string;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", link: "/admin" },
  { label: "Posts", link: "/admin/posts" },
  { label: "Users", link: "/admin/users" },
  { label: "Write", link: "/admin/write" },
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
