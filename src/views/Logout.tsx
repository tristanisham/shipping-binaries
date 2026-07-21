import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

export const Logout: FC = () => {
  const meta: LayoutMeta = {
    title: "Logged out | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <main class="container mx-auto h-full w-2/5">
        <Header nav={setCurrentNavItem(defaultHeaderNav, "/logout")} />
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="text-3xl font-bold">Logged out.</h1>
        </section>
      </main>
    </Layout>
  );
};
