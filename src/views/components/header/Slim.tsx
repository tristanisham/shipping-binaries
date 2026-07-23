import type { FC } from "hono/jsx";
import type { ViewerProps } from "../../../auth/viewer.js";
import type { HeaderNavItem } from "./Header.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { UserMenu } from "./UserMenu.js";
import { WeatherWidget } from "./WeatherWidget.js";

type HeaderSlimProps = ViewerProps & {
  showCheckerboard?: boolean;
  nav: HeaderNavItem[];
  size?: "sm" | "md" | "lg";
};

export const HeaderSlim: FC<HeaderSlimProps> = ({
  showCheckerboard = true,
  isAdmin = false,
  isAuthenticated = false,
  nav,
  size = "lg",
  viewerUsername = null,
}) => {
  const widthClass = size === "sm"
    ? "w-max max-w-full"
    : size === "md"
    ? "w-2/3"
    : "w-full";

  return (
    <header>
      <nav class="flex w-full py-2">
        <div
          class={`relative mx-auto mt-3 mb-1 flex items-center rounded-b-md bg-mist-600 text-amber-50 dark:bg-amber-50 dark:text-mist-600 ${widthClass}`}
        >
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
                class={item.current
                  ? "font-bold underline decoration-2 decoration-amber-50 dark:decoration-mist-600"
                  : "hover:underline"}
                href={item.link}
              >
                {item.label}
              </a>
            ))}
          </div>
          <div class="ml-8 flex items-center gap-2 pr-4">
            <ThemeToggle compact />
            <UserMenu
              compact
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              username={viewerUsername}
            />
          </div>
        </div>
      </nav>
    </header>
  );
};
