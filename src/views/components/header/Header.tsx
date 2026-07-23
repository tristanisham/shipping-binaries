import type { FC } from "hono/jsx";
import type { ViewerProps } from "../../../auth/viewer.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { UserMenu } from "./UserMenu.js";
import { WeatherWidget } from "./WeatherWidget.js";

export type HeaderNavItem = {
  label: string;
  link: string;
  current: boolean;
};

export const defaultHeaderNav: HeaderNavItem[] = [
  { label: "Home", link: "/", current: false },
  { label: "About", link: "/about", current: false },
  { label: "Blog", link: "/blog", current: false },
];

export const setCurrentNavItem = (
  nav: readonly HeaderNavItem[],
  currentLink: string,
): HeaderNavItem[] =>
  nav.map((item) => ({
    ...item,
    current: item.link === currentLink,
  }));

type HeaderProps = ViewerProps & {
  nav: HeaderNavItem[];
};

export const Header: FC<HeaderProps> = ({
  isAdmin = false,
  isAuthenticated = false,
  nav,
  viewerUsername = null,
}) => {
  return (
    <header class={""}>
      <nav class={"@container flex w-full flex-col py-2"}>
        <div class="mx-auto w-max max-w-full">
          <div class="my-1 flex w-full items-center justify-between rounded-b-md bg-mist-600 dark:bg-amber-50">
            <WeatherWidget />
            <div class="flex items-center">
              <ThemeToggle />
              <div class="text-amber-50 dark:text-mist-600">
                <UserMenu
                  isAdmin={isAdmin}
                  isAuthenticated={isAuthenticated}
                  username={viewerUsername}
                />
              </div>
            </div>
          </div>
          <div class="flex">
            <div class="grow font-black-ops-one pb-4 text-center text-8xl text-mist-600 @max-[40rem]:text-[10.2cqw] @max-[40rem]:whitespace-nowrap @min-[40rem]:@max-[55rem]:text-left dark:text-amber-50">
              Shipping Binaries
            </div>
            <div class="hidden flex-col items-end gap-2 pb-4 text-xl @min-[40rem]:@max-[55rem]:flex">
              {nav.map((item) => (
                <a
                  aria-current={item.current ? "page" : undefined}
                  class={item.current
                    ? "font-bold text-mist-600 underline decoration-2 decoration-mist-600 dark:text-amber-50 dark:decoration-amber-50"
                    : "hover:text-mist-600 dark:hover:text-amber-50"}
                  href={item.link}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div class="flex w-full flex-row items-center justify-center @min-[40rem]:@max-[55rem]:hidden">
          <div class="flex flex-row gap-4 text-xl @max-[40rem]:text-2xl">
            {nav.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                class={item.current
                  ? "font-bold text-mist-600 underline decoration-2 decoration-mist-600 dark:text-amber-50 dark:decoration-amber-50"
                  : "hover:text-mist-600 dark:hover:text-amber-50"}
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
