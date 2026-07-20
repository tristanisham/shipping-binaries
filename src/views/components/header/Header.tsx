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
    <header class={"border-red-500 w-full"}>
      <nav class={"flex flex-row flex-wrap justify-between py-2"}>
        <div className="flex flex-col">
          <div class="font-black-ops-one pb-4 text-6xl text-mist-600">
            Shipping Binaries
          </div>
          <div className="flex flex-row gap-4">
            {nav.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                class={
                  item.current
                    ? "font-bold text-mist-600 underline decoration-2 decoration-mist-600"
                    : "hover:text-mist-600"
                }
                href={item.link}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <WeatherWidget />
      </nav>
    </header>
  );
};
