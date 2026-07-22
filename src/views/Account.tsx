import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AccountProps = {
  email: string;
};

export const Account: FC<AccountProps> = ({ email }) => {
  const meta: LayoutMeta = {
    title: "Account | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <Header
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto h-full w-2/5">
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="mb-4 text-3xl font-bold">Account</h1>
          <p>{email}</p>
          <a
            class="mt-8 inline-block rounded-md bg-mist-600 px-4 py-3 font-bold text-amber-50 dark:bg-amber-50 dark:text-mist-600"
            href="/logout"
          >
            Log out
          </a>
        </section>
      </main>
    </Layout>
  );
};
