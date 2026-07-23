import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

export const About: FC<ViewerProps> = ({
  isAdmin = false,
  isAuthenticated = false,
}) => {
  const meta: LayoutMeta = {
    title: "About | Shipping Binaries",
    description:
      "Learn more about Shipping Binaries, a blog about the real-world experience of building software for people.",
    keywords: [
      "Software Development",
      "Shipping Binaries",
      "Software Engineering Blog",
    ],
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/about")}
      />
      <main class="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <article class="space-y-4 leading-relaxed">
          Shipping Binaries is a the story of a modern open source software developer creating <a href="https://github.com/tristanisham/zvm">open source</a> software
          for other developers. 
        </article>
      </main>
    </Layout>
  );
};
