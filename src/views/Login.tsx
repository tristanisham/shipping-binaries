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

export const Login: FC<LoginProps> = ({ error, login = "" }) => {
  const meta: LayoutMeta = {
    title: "Log in | Shipping Binaries",
    description: "Log in to Shipping Binaries.",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <main class="container mx-auto h-full w-2/5">
        <Header nav={setCurrentNavItem(defaultHeaderNav, "/login")} />
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
              <input
                autocomplete="current-password"
                class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                name="password"
                required
                type="password"
              />
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
    </Layout>
  );
};
