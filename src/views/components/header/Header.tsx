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

type HeaderProps = {
  nav: HeaderNavItem[];
};

export const Header: FC<HeaderProps> = ({ nav }) => {
  return (
    <header class={""}>
      <nav class={"flex w-full flex-col items-center py-2"}>
        <div class="w-max">
          <div class="my-1 flex w-full items-center justify-between rounded-b-md bg-mist-600 dark:bg-amber-50">
            <div class="flex items-center">
              <button
                id="light-dark-toggle"
                aria-label="Toggle light and dark theme"
                class="m-4 cursor-pointer text-amber-50 dark:text-mist-600"
                onclick={'const root = document.documentElement; const isDark = root.classList.toggle("dark"); localStorage.setItem("theme", isDark ? "dark" : "light");'}
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
              <WeatherWidget />
            </div>
            <a
              aria-label="Log in"
              class="m-4 cursor-pointer text-amber-50 dark:text-mist-600"
              href="/login"
            >
              <svg
                aria-hidden="true"
                class="size-5 fill-none stroke-current"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </a>
          </div>
          <div class="font-black-ops-one pb-4 text-center text-8xl text-mist-600 dark:text-amber-50">
            Shipping Binaries
          </div>
        </div>
        <div class="flex w-full flex-row items-center justify-center">
          <div class="flex flex-row gap-4 text-xl">
            {nav.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                class={
                  item.current
                    ? "font-bold text-mist-600 underline decoration-2 decoration-mist-600 dark:text-amber-50 dark:decoration-amber-50"
                    : "hover:text-mist-600 dark:hover:text-amber-50"
                }
                href={item.link}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
};
