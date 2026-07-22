import type { FC } from "hono/jsx";
import type { Post } from "../models/post.js";
import { Layout, LayoutMeta } from "./layouts/MainLayout.js";
import { PostList } from "./components/blog/PostList.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";

type HomeProps = {
  isAuthenticated?: boolean;
  posts?: readonly Post[];
};

export const Home: FC<HomeProps> = ({ isAuthenticated = false, posts = [] }) => {
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
      <main class={" h-full w-2/5 mx-auto container"}>
        <PostList posts={posts} />
      </main>
    </Layout>
  );
};
