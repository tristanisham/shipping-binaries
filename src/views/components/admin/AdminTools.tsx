import type { Child, FC } from "hono/jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.js";
import { panelDivider } from "./panel.js";

type AdminToolsProps = {
  children?: Child;
  title: string;
};

export const AdminTools: FC<AdminToolsProps> = ({ children, title }) => (
  <Card class="min-w-0 self-start gap-0 py-0">
    <CardHeader class={`border-b py-6 ${panelDivider}`}>
      <CardTitle class="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent class="px-0">{children}</CardContent>
  </Card>
);

type AdminToolSectionProps = {
  children?: Child;
  open?: boolean;
  title: string;
};

export const AdminToolSection: FC<AdminToolSectionProps> = ({
  children,
  open = false,
  title,
}) => (
  <details class={`group border-b last:border-b-0 ${panelDivider}`} open={open}>
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
      {title}
      <span
        aria-hidden="true"
        class="text-xs transition-transform group-open:rotate-90"
      >
        ▶
      </span>
    </summary>
    <div class="px-6 pb-5">{children}</div>
  </details>
);
