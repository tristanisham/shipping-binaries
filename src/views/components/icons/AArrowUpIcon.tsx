import type { FC } from "hono/jsx";

export const AArrowUpIcon: FC<{ class?: string }> = ({
  class: className = "size-4 fill-none stroke-current",
}) => (
  <svg
    aria-hidden="true"
    class={className}
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <path d="M3.5 13h6" />
    <path d="m2 16 4.5-9 4.5 9" />
    <path d="M18 16V7" />
    <path d="m14 11 4-4 4 4" />
  </svg>
);
