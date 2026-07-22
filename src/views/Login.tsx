import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type LoginProps = {
  error?: string;
  login?: string;
};

const passwordToggleScript = `
(function () {
  var btn = document.getElementById("toggle-password");
  var input = document.getElementById("login-password");
  if (!btn || !input) return;
  btn.addEventListener("click", function () {
    var show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.setAttribute("aria-pressed", show ? "true" : "false");
    btn.querySelector("[data-icon=eye]").classList.toggle("hidden", show);
    btn.querySelector("[data-icon=eye-off]").classList.toggle("hidden", !show);
  });
})();
`;

export const Login: FC<LoginProps> = ({ error, login = "" }) => {
  const meta: LayoutMeta = {
    title: "Log in | Shipping Binaries",
    description: "Log in to Shipping Binaries.",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <Header nav={setCurrentNavItem(defaultHeaderNav, "/login")} />
      <main class="container mx-auto h-full w-2/5">
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="mb-8 text-3xl font-bold">Log in</h1>
          <form action="/login" class="flex flex-col gap-5" method="post">
            <label class="flex flex-col gap-2 font-bold">
              Email or username
              <input
                autocomplete="username"
                autofocus
                class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                name="login"
                required
                value={login}
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Password
              <div class="relative flex items-center">
                <input
                  autocomplete="current-password"
                  class="w-full rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                  id="login-password"
                  name="password"
                  required
                  type="password"
                />
                <button
                  aria-label="Show password"
                  aria-pressed="false"
                  class="absolute right-0 inline-flex h-full cursor-pointer items-center px-3 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
                  id="toggle-password"
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    class="size-5 fill-none stroke-current"
                    data-icon="eye"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <svg
                    aria-hidden="true"
                    class="hidden size-5 fill-none stroke-current"
                    data-icon="eye-off"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.42" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M2 2l20 20" />
                  </svg>
                </button>
              </div>
            </label>
            {error && (
              <p class="font-bold text-burgundy-500" role="alert">
                {error}
              </p>
            )}
            <button
              class="cursor-pointer rounded-md bg-mist-600 px-4 py-3 font-bold text-amber-50 dark:bg-amber-50 dark:text-mist-600"
              type="submit"
            >
              Log in
            </button>
          </form>
        </section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: passwordToggleScript }} />
    </Layout>
  );
};
