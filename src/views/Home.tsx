import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../models/post.js";
import { Layout, LayoutMeta } from "./layouts/MainLayout.js";
import { PostGrid } from "./components/blog/posts/PostGrid.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";

type HomeProps = {
  currentPage?: number;
  isAuthenticated?: boolean;
  posts?: readonly PostWithAuthor[];
};

export const Home: FC<HomeProps> = (
  { currentPage = 1, isAuthenticated = false, posts = [] },
) => {
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
      <Header
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/")}
      />
      <main class="container mx-auto px-4 pb-16">
        <PostGrid currentPage={currentPage} posts={posts} />
      </main>
    </Layout>
  );
};
