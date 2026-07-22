import { cva, type VariantProps } from "class-variance-authority";
import type { FC, JSX } from "hono/jsx";
import { cn } from "./utils.js";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium shadow-xs outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-chocolate-500/30 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-chocolate-400/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-burgundy-700 text-burgundy-50 hover:bg-burgundy-600 dark:bg-burgundy-500 dark:text-burgundy-950 dark:hover:bg-burgundy-400",
        secondary:
          "bg-chocolate-500 text-chocolate-950 hover:bg-chocolate-400",
        outline:
          "border border-burgundy-700 bg-transparent text-burgundy-800 hover:bg-burgundy-100 dark:border-burgundy-400 dark:text-burgundy-200 dark:hover:bg-burgundy-900/60",
        ghost:
          "shadow-none hover:bg-onyx-200/70 dark:hover:bg-onyx-800/70",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "class"> &
  VariantProps<typeof buttonVariants> & {
    class?: string;
  };

export const Button: FC<ButtonProps> = ({
  class: className,
  variant,
  size,
  type = "button",
  ...props
}) => (
  <button
    type={type}
    data-slot="button"
    data-variant={variant ?? "default"}
    data-size={size ?? "default"}
    class={cn(buttonVariants({ variant, size }), className)}
    {...props}
  />
);
