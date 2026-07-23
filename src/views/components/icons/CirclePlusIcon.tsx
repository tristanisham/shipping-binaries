import type { FC } from "hono/jsx";

export const CirclePlusIcon: FC = () => (
  <svg
    aria-hidden="true"
    class="size-4 fill-none stroke-current"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </svg>
);
