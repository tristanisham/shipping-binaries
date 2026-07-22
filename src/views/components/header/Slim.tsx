import type { FC } from "hono/jsx";
import type { HeaderNavItem } from "./Header.js";
import { UserMenu } from "./UserMenu.js";
import { WeatherWidget } from "./WeatherWidget.js";

type HeaderSlimProps = {
  showCheckerboard?: boolean;
  isAuthenticated?: boolean;
  nav: HeaderNavItem[];
  size?: "sm" | "md" | "lg";
};

export const HeaderSlim: FC<HeaderSlimProps> = ({
  showCheckerboard = true,
  isAuthenticated = false,
  nav,
  size = "lg",
}) => {
  const widthClass = size === "sm"
    ? "w-max max-w-full"
    : size === "md"
      ? "w-2/3"
      : "w-full";

  return (
    <header>
      <nav class="flex w-full py-2">
        <div class={`relative mx-auto mt-3 mb-1 flex items-center rounded-b-md bg-mist-600 text-amber-50 dark:bg-amber-50 dark:text-mist-600 ${widthClass}`}>
          {showCheckerboard && (
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-amber-50)_25%,transparent_0_50%,var(--color-amber-50)_0_75%,transparent_0)] bg-[length:0.5rem_0.5rem] [background-position:0.25rem_0] dark:bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-mist-600)_25%,transparent_0_50%,var(--color-mist-600)_0_75%,transparent_0)]"
            />
          )}
          <a
            aria-label="Shipping Binaries home"
            class="ml-4 whitespace-nowrap font-black-ops-one text-3xl"
            href="/"
          >
            Shipping Binaries
          </a>
          <WeatherWidget />
          <div class="ml-auto flex items-center gap-4 text-xl">
            {nav.map((item) => (
              <a
                aria-current={item.current ? "page" : undefined}
                class={
                  item.current
                    ? "font-bold underline decoration-2 decoration-amber-50 dark:decoration-mist-600"
                    : "hover:underline"
                }
                href={item.link}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div class="flex items-center">
            <button
              id="light-dark-toggle"
              aria-label="Toggle light and dark theme"
              class="m-4 cursor-pointer"
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
            <UserMenu isAdmin={isAuthenticated} />
          </div>
        </div>
      </nav>
    </header>
  );
};
