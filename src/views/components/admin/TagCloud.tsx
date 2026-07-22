import type { FC, JSX } from "hono/jsx";
import { cn } from "../ui/utils.js";

type TagCloudProps = Omit<JSX.IntrinsicElements["div"], "class"> & {
  class?: string;
};

export const adminTagClass =
  "rounded-full border border-amber-50/30 bg-amber-50/10 px-2 py-0.5 text-xs font-normal text-amber-50 transition-colors hover:bg-amber-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-50/60 dark:border-mist-600/30 dark:bg-mist-600/10 dark:text-mist-600 dark:hover:bg-mist-600/20 dark:focus-visible:ring-mist-600/60";

export const TagCloud: FC<TagCloudProps> = ({ class: className, ...props }) => (
  <div
    class={cn("flex min-h-6 flex-wrap items-center gap-1.5", className)}
    {...props}
  />
);
