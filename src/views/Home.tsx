import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { Layout, LayoutMeta } from "./layouts/MainLayout.js";

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
      <main class={"bg-white h-full"}>
        <p class={"text-green-500"}>Test!!!</p>
      </main>
    </Layout>
  );
};
