import type { FC } from "hono/jsx";

export const EditIcon: FC<{ class?: string }> = ({
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
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
