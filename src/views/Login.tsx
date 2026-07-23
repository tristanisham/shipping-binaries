import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import {
  panelDivider,
  panelField,
  panelMuted,
  panelRow,
} from "./components/admin/panel.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type LoginProps = {
  error?: string;
  login?: string;
  notice?: string;
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

export const Login: FC<LoginProps> = ({ error, login = "", notice }) => {
  const meta: LayoutMeta = {
    title: "Log in | Shipping Binaries",
    description: "Log in to Shipping Binaries.",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <Header nav={setCurrentNavItem(defaultHeaderNav, "/login")} />
      <main class="container mx-auto h-full w-full px-4">
        <section class="mx-auto mt-10 max-w-md sm:mt-16">
          <Card>
            <CardHeader class={`border-b ${panelDivider}`}>
              <CardTitle class="text-2xl">Log in</CardTitle>
              <CardDescription>
                Sign in to manage Shipping Binaries.
              </CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-5">
              {notice && (
                <p
                  class={`rounded-lg px-4 py-3 text-sm font-medium ${panelRow}`}
                  role="status"
                >
                  {notice}
                </p>
              )}
              <form action="/login" class="flex flex-col gap-5" method="post">
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Email or username
                  <Input
                    autocomplete="username"
                    autofocus
                    class={cn("h-11", panelField)}
                    name="login"
                    required
                    value={login}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Password
                  <div class="relative">
                    <Input
                      autocomplete="current-password"
                      class={cn("h-11 pr-12", panelField)}
                      id="login-password"
                      name="password"
                      required
                      type="password"
                    />
                    <button
                      aria-label="Show password"
                      aria-pressed="false"
                      class="absolute inset-y-0 right-0 inline-flex cursor-pointer items-center px-3 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
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
                  <p
                    class="text-sm font-bold text-burgundy-300 dark:text-burgundy-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                <Button class="h-11 w-full" type="submit" variant="tertiary">
                  Log in
                </Button>
                <a
                  class={`w-fit text-sm underline ${panelMuted}`}
                  href="/forgot-password"
                >
                  Forgot password?
                </a>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: passwordToggleScript }} />
    </Layout>
  );
};
