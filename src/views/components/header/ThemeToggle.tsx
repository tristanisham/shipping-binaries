import type { FC } from "hono/jsx";

type ThemeToggleProps = {
  compact?: boolean;
};

const toggleTheme =
  'const root = document.documentElement; const isDark = root.classList.toggle("dark"); localStorage.setItem("theme", isDark ? "dark" : "light");';

export const ThemeToggle: FC<ThemeToggleProps> = ({ compact = false }) => (
  <button
    id="light-dark-toggle"
    aria-label="Toggle light and dark theme"
    class={compact
      ? "cursor-pointer"
      : "m-4 cursor-pointer text-amber-50 dark:text-mist-600"}
    onclick={toggleTheme}
    type="button"
  >
    <svg
      aria-hidden="true"
      class="size-5 fill-current"
      viewBox="0 0 24 24"
    >
      <path d="M11 1h2v3h-2V1Zm0 19h2v3h-2v-3ZM1 11h3v2H1v-2Zm19 0h3v2h-3v-2ZM4.22 2.81l2.12 2.12-1.41 1.41-2.12-2.12 1.41-1.41Zm13.44 13.43 2.12 2.12-1.42 1.42-2.12-2.12 1.42-1.42ZM2.81 19.78l2.12-2.12 1.41 1.41-2.12 2.12-1.41-1.41ZM16.24 4.93l2.12-2.12 1.42 1.41-2.12 2.12-1.42-1.41ZM12 18a6 6 0 0 0 0-12v12Z" />
    </svg>
  </button>
);
