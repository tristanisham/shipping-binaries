import type { FC, JSX } from "hono/jsx";
import { panelSurface } from "../admin/panel.js";
import { cn } from "./utils.js";

type DivProps = Omit<JSX.IntrinsicElements["div"], "class"> & {
  class?: string;
};

// Admin sections use the site's inverse panel treatment (see panel.ts):
// secondary-color background with primary-color text, flipped in dark mode.
export const Card: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card"
    class={cn(
      "flex flex-col gap-6 rounded-xl border border-amber-50/15 py-6 shadow-sm dark:border-mist-600/15",
      panelSurface,
      className,
    )}
    {...props}
  />
);

export const CardHeader: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card-header"
    class={cn(
      "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
      className,
    )}
    {...props}
  />
);

export const CardTitle: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card-title"
    class={cn("leading-none font-semibold", className)}
    {...props}
  />
);

export const CardDescription: FC<DivProps> = ({
  class: className,
  ...props
}) => (
  <div
    data-slot="card-description"
    class={cn("text-sm text-amber-50/70 dark:text-mist-600/70", className)}
    {...props}
  />
);

export const CardAction: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card-action"
    class={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className,
    )}
    {...props}
  />
);

export const CardContent: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card-content"
    class={cn("px-6", className)}
    {...props}
  />
);

export const CardFooter: FC<DivProps> = ({ class: className, ...props }) => (
  <div
    data-slot="card-footer"
    class={cn("flex items-center px-6 [.border-t]:pt-6", className)}
    {...props}
  />
);
