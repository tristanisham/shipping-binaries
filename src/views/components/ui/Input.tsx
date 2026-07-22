import type { FC, JSX } from "hono/jsx";
import { cn } from "./utils.js";

type InputProps = Omit<JSX.IntrinsicElements["input"], "class"> & {
  class?: string;
};

export const Input: FC<InputProps> = ({ class: className, type, ...props }) => (
  <input
    type={type}
    data-slot="input"
    class={cn(
      "h-9 w-full min-w-0 rounded-md border border-onyx-300 bg-amber-50/70 px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-burgundy-700 selection:text-burgundy-50 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-onyx-500 focus-visible:border-burgundy-600 focus-visible:ring-[3px] focus-visible:ring-chocolate-500/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:border-onyx-700 dark:bg-onyx-950/60 dark:placeholder:text-onyx-400 dark:focus-visible:border-burgundy-400 dark:focus-visible:ring-chocolate-400/30",
      className,
    )}
    {...props}
  />
);
