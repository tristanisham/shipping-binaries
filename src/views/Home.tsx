import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { Layout, LayoutMeta } from "./layouts/MainLayout.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";

export const Home: FC = (_props) => {
  const meta: LayoutMeta = {
    title: "Home | Shipping Binaries",
    description:
      "Shipping Binaries is a blog about software development. It covers the real world experience of creating software for people.",
    keywords: [
      "Software Development",
      "Agentic Engineering",
      "AI Engineer",
      "Software Development Blog",
    ],
  };

  return (
    <Layout meta={meta}>
      <main class={"h-full w-full px-4 md:w-2/5 md:px-0 mx-auto container"}>
        <Header
          nav={setCurrentNavItem(defaultHeaderNav, "/")}
        />
      </main>
    </Layout>
  );
};
