import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../models/post.js";
import { PostList } from "./components/blog/posts/PostList.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type BlogIndexProps = {
  currentPage?: number;
  isAuthenticated?: boolean;
  posts: readonly PostWithAuthor[];
};

export const BlogIndex: FC<BlogIndexProps> = ({
  currentPage = 1,
  isAuthenticated = false,
  posts,
}) => {
  const meta: LayoutMeta = {
    title: "Blog | Shipping Binaries",
    description: "Software development articles from Shipping Binaries.",
  };

  return (
    <Layout meta={meta}>
      <Header
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/blog")}
      />
      <main class="container mx-auto px-4 pb-16">
        <h1 class="mt-12 text-4xl font-bold">Blog</h1>
        <PostList currentPage={currentPage} posts={posts} />
      </main>
    </Layout>
  );
};
