import type { FC } from "hono/jsx";
import type { ViewerProps } from "../../../auth/viewer.js";
import { LogoutIcon } from "../icons/LogoutIcon.js";
import type { HeaderNavItem } from "./Header.js";
import { ThemeToggle } from "./ThemeToggle.js";
import { getUserMenuItems, UserMenu } from "./UserMenu.js";
import { WeatherWidget } from "./WeatherWidget.js";

type HeaderSlimProps = ViewerProps & {
  showCheckerboard?: boolean;
  nav: HeaderNavItem[];
  size?: "sm" | "md" | "lg";
};

const slimMobileMenuScript = `
(() => {
  const menu = document.currentScript?.closest("[data-slim-mobile-menu]");
  const trigger = menu?.querySelector("summary");
  if (!menu || !trigger || menu.dataset.ready === "true") return;

  menu.dataset.ready = "true";

  menu.addEventListener("toggle", () => {
    trigger.setAttribute("aria-expanded", menu.open.toString());
    trigger.setAttribute(
      "aria-label",
      menu.open ? "Close navigation menu" : "Open navigation menu",
    );
    trigger.setAttribute(
      "title",
      menu.open ? "Close navigation menu" : "Open navigation menu",
    );
  });

  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !menu.contains(event.target)) {
      menu.open = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.open) {
      menu.open = false;
      trigger.focus();
    }
  });
})();
`;

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
  const userMenuItems = getUserMenuItems(isAdmin, viewerUsername);

  return (
    <header>
      <nav class="flex w-full py-2">
        <div
          class={`relative mx-auto mt-3 mb-1 flex items-center rounded-b-md bg-mist-600 py-2 text-amber-50 lg:py-0 dark:bg-amber-50 dark:text-mist-600 ${widthClass}`}
        >
          {showCheckerboard && (
            <div
              aria-hidden="true"
              class="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-amber-50)_25%,transparent_0_50%,var(--color-amber-50)_0_75%,transparent_0)] bg-[length:0.5rem_0.5rem] [background-position:0.25rem_0] dark:bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-mist-600)_25%,transparent_0_50%,var(--color-mist-600)_0_75%,transparent_0)]"
            />
          )}
          <a
            aria-label="Shipping Binaries home"
            class="ml-4 min-w-0 whitespace-nowrap font-black-ops-one text-[clamp(1.5rem,7.6vw,1.875rem)] lg:text-3xl"
            href="/"
          >
            Shipping Binaries
          </a>
          <div class="hidden lg:block">
            <WeatherWidget instance="slim-desktop" />
          </div>
          <div class="ml-auto hidden items-center gap-4 text-xl lg:flex">
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
          <div class="ml-8 hidden items-center gap-2 pr-4 lg:flex">
            <ThemeToggle compact id="slim-desktop-theme-toggle" />
            <UserMenu
              compact
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              username={viewerUsername}
            />
          </div>
          <details
            class="group relative ml-auto lg:hidden"
            data-slim-mobile-menu
          >
            <summary
              aria-controls="slim-mobile-navigation"
              aria-expanded="false"
              aria-haspopup="menu"
              aria-label="Open navigation menu"
              class="mr-4 flex cursor-pointer list-none items-center justify-center [&::-webkit-details-marker]:hidden"
              title="Open navigation menu"
            >
              <svg
                aria-hidden="true"
                class="lucide lucide-menu-icon lucide-menu"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
              >
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
              </svg>
            </summary>
            <div
              class="absolute right-0 top-full z-40 mt-3 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md bg-mist-600 text-amber-50 shadow-lg ring-1 ring-amber-50/30 dark:bg-amber-50 dark:text-mist-600 dark:ring-mist-600/30"
              id="slim-mobile-navigation"
              role="menu"
            >
              <nav aria-label="Primary">
                <ul class="flex flex-col px-4 py-3 text-base">
                  {nav.map((item) => (
                    <li>
                      <a
                        aria-current={item.current ? "page" : undefined}
                        class={item.current
                          ? "block rounded-sm px-2 py-2 font-bold underline decoration-2 decoration-amber-50 dark:decoration-mist-600"
                          : "block rounded-sm px-2 py-2 hover:bg-amber-50/15 focus:bg-amber-50/15 focus:outline-none dark:hover:bg-mist-600/15 dark:focus:bg-mist-600/15"}
                        href={item.link}
                        role="menuitem"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div class="border-t border-amber-50/20 dark:border-mist-600/20">
                <nav aria-label="Account">
                  <ul class="flex flex-col px-4 py-3 text-base">
                    {isAuthenticated
                      ? userMenuItems.map((item) => (
                        <li>
                          <a
                            class="block rounded-sm px-2 py-2 hover:bg-amber-50/15 focus:bg-amber-50/15 focus:outline-none dark:hover:bg-mist-600/15 dark:focus:bg-mist-600/15"
                            href={item.link}
                            role="menuitem"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))
                      : (
                        <li>
                          <a
                            class="block rounded-sm px-2 py-2 hover:bg-amber-50/15 focus:bg-amber-50/15 focus:outline-none dark:hover:bg-mist-600/15 dark:focus:bg-mist-600/15"
                            href="/login"
                            role="menuitem"
                          >
                            Log in
                          </a>
                        </li>
                      )}
                  </ul>
                </nav>
              </div>
              <div class="flex items-center gap-3 border-t border-amber-50/20 px-4 py-3 dark:border-mist-600/20">
                <WeatherWidget compact instance="slim-mobile" />
                <div class="ml-auto flex items-center gap-3">
                  <ThemeToggle compact id="slim-mobile-theme-toggle" />
                  {isAuthenticated && (
                    <a
                      aria-label="Log out"
                      class="inline-flex items-center gap-2 rounded-md bg-burgundy-700 px-3 py-2 text-sm font-medium text-amber-50 hover:bg-burgundy-600 focus:bg-burgundy-600 focus:outline-none dark:bg-burgundy-400 dark:text-amber-50 dark:hover:bg-burgundy-300 dark:focus:bg-burgundy-300"
                      href="/logout"
                      role="menuitem"
                      title="Log out"
                    >
                      <LogoutIcon />
                      Log out
                    </a>
                  )}
                </div>
              </div>
            </div>
            <script
              dangerouslySetInnerHTML={{ __html: slimMobileMenuScript }}
            />
          </details>
        </div>
      </nav>
    </header>
  );
};
