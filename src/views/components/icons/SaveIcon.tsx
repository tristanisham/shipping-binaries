import type { Child, FC } from "hono/jsx";

const SaveGlyph: FC<{ children: Child }> = ({ children }) => (
  <svg
    aria-hidden="true"
    class="size-4 fill-none stroke-current"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    {children}
  </svg>
);

export const SaveIcon: FC = () => (
  <SaveGlyph>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
  </SaveGlyph>
);

export const SaveCheckIcon: FC = () => (
  <SaveGlyph>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V11" />
    <path d="M17 21v-3" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" />
    <path d="m15 15 2 2 4-4" />
  </SaveGlyph>
);

export const SaveXIcon: FC = () => (
  <SaveGlyph>
    <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V11" />
    <path d="M17 21v-3" />
    <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    <path d="M13 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2" />
    <path d="m15 14 5 5" />
    <path d="m20 14-5 5" />
  </SaveGlyph>
);
