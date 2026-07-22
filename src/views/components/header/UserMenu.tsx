import type { FC } from "hono/jsx";

type UserMenuProps = {
  compact?: boolean;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
};

const adminNav = [
  { label: "Dashboard", link: "/admin" },
  { label: "Account", link: "/admin/account" },
];

export const UserMenu: FC<UserMenuProps> = ({
  compact = false,
  isAuthenticated = false,
  isAdmin = false,
}) => {
  const href = isAdmin
    ? "/admin"
    : isAuthenticated
    ? "/admin/account"
    : "/login";
  const label = isAdmin
    ? "Open admin dashboard"
    : isAuthenticated
    ? "Open account"
    : "Log in";

  return (
    <div class="group relative flex items-center">
      <a
        aria-haspopup={isAdmin ? "menu" : undefined}
        aria-label={label}
        class={compact
          ? "inline-flex cursor-pointer"
          : "m-4 inline-flex cursor-pointer"}
        href={href}
      >
        <svg
          aria-hidden="true"
          class="size-5 fill-none stroke-current"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          {isAdmin
            ? (
              <>
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="M6.376 18.91a6 6 0 0 1 11.249.003" />
                <circle cx="12" cy="11" r="4" />
              </>
            )
            : (
              <>
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </>
            )}
        </svg>
      </a>
      {isAdmin && (
        <div
          class="pointer-events-none invisible absolute right-0 top-full z-20 w-40 translate-y-1 pt-1 opacity-0 transition-all duration-200 ease-out group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
          role="menu"
        >
          <div class="overflow-hidden rounded-md bg-mist-600 py-2 text-amber-50 shadow-lg ring-1 ring-amber-50/30 dark:bg-amber-50 dark:text-mist-600 dark:ring-mist-600/30">
            {adminNav.map((item) => (
              <a
                class="block px-4 py-2 hover:bg-amber-50/15 focus:bg-amber-50/15 focus:outline-none dark:hover:bg-mist-600/15 dark:focus:bg-mist-600/15"
                href={item.link}
                role="menuitem"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
