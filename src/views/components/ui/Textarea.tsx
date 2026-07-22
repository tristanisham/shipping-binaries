import type { FC, JSX } from "hono/jsx";
import { cn } from "./utils.js";

type TextareaProps = Omit<JSX.IntrinsicElements["textarea"], "class"> & {
  class?: string;
};

export const Textarea: FC<TextareaProps> = ({
  class: className,
  ...props
}) => (
  <textarea
    data-slot="textarea"
    class={cn(
      "field-sizing-content flex min-h-16 w-full rounded-md border border-onyx-300 bg-amber-50/70 px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-onyx-500 focus-visible:border-burgundy-600 focus-visible:ring-[3px] focus-visible:ring-chocolate-500/30 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-onyx-700 dark:bg-onyx-950/60 dark:placeholder:text-onyx-400 dark:focus-visible:border-burgundy-400 dark:focus-visible:ring-chocolate-400/30",
      className,
    )}
    {...props}
  />
);
