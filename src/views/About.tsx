import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

export const About: FC = () => {
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
      <main class="container mx-auto h-full w-full px-4 md:w-2/5 md:px-0">
        <Header
          nav={setCurrentNavItem(defaultHeaderNav, "/about")}
        />
        <article class="py-8">
        
        </article>
      </main>
    </Layout>
  );
};
