import { cva, type VariantProps } from "class-variance-authority";
import type { FC, JSX } from "hono/jsx";
import { cn } from "./utils.js";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        draft:
          "border-chocolate-300 bg-chocolate-100 text-chocolate-800 dark:border-chocolate-700 dark:bg-chocolate-900 dark:text-chocolate-200",
        published:
          "border-onyx-300 bg-onyx-100 text-onyx-800 dark:border-onyx-600 dark:bg-onyx-800 dark:text-onyx-100",
        outline:
          "border-burgundy-300 bg-transparent text-burgundy-700 dark:border-burgundy-700 dark:text-burgundy-300",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

type BadgeProps =
  & Omit<JSX.IntrinsicElements["span"], "class">
  & VariantProps<typeof badgeVariants>
  & {
    class?: string;
  };

export const Badge: FC<BadgeProps> = ({
  class: className,
  variant,
  ...props
}) => (
  <span
    data-slot="badge"
    data-variant={variant ?? "outline"}
    class={cn(badgeVariants({ variant }), className)}
    {...props}
  />
);
