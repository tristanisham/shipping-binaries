import type { FC } from "hono/jsx";
import { WeatherWidget } from "./WeatherWidget.js";

export type HeaderNavItem = {
  label: string;
  link: string;
  current: boolean;
};

export const defaultHeaderNav: HeaderNavItem[] = [
  { label: "Home", link: "/", current: false },
  { label: "About", link: "/about", current: false },
];

export const setCurrentNavItem = (
  nav: readonly HeaderNavItem[],
  currentLink: string,
): HeaderNavItem[] =>
  nav.map((item) => ({
    ...item,
    current: item.link === currentLink,
  }));

// Lucide "moon" and "sun" (lucide.dev, ISC). Inlined because lucide-react
// needs React and this app renders with hono/jsx.
const lucideIconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
} as const;

const ThemeToggle: FC = () => {
  return (
    <button
      id="theme-toggle"
      type="button"
      aria-label="Toggle dark mode"
      class="text-mist-600 hover:text-mist-500 dark:text-amber-50 dark:hover:text-amber-50/70"
    >
      <svg {...lucideIconProps} class="size-5 dark:hidden" aria-hidden="true">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
      <svg
        {...lucideIconProps}
        class="hidden size-5 dark:block"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    </button>
  );
};

type HeaderProps = {
  nav: HeaderNavItem[];
};

export const Header: FC<HeaderProps> = ({ nav }) => {
  return (
    <header class={"border-red-500 w-full"}>
      <nav class={"flex flex-row flex-wrap justify-between py-2"}>
        <div className="flex flex-col">
          <div class="font-black-ops-one pb-4 text-4xl sm:text-6xl text-mist-600 dark:text-amber-50">
            Shipping Binaries
          </div>
          <div className="flex flex-row items-center gap-4">
            {nav.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                class={
                  item.current
                    ? "font-bold text-mist-600 underline decoration-2 decoration-mist-600 dark:text-amber-50 dark:decoration-amber-50"
                    : "hover:text-mist-600 dark:hover:text-amber-50/70"
                }
                href={item.link}
              >
                {item.label}
              </a>
            ))}
            <ThemeToggle />
          </div>
        </div>
        <WeatherWidget />
      </nav>
    </header>
  );
};
