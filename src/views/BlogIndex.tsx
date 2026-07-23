import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import { PostList } from "./components/blog/posts/PostList.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";
import { toAbsoluteUrl } from "./components/SocialMeta.js";

type BlogIndexProps = ViewerProps & {
  currentPage?: number;
  posts: readonly PostWithAuthor[];
};

export const BlogIndex: FC<BlogIndexProps> = ({
  currentPage = 1,
  isAdmin = false,
  isAuthenticated = false,
  posts,
}) => {
  const meta: LayoutMeta = {
    title: "Blog | Shipping Binaries",
    description: "Software development articles from Shipping Binaries.",
    canonical: toAbsoluteUrl("/blog"),
    social: {
      title: "Shipping Binaries Blog",
    },
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/blog")}
      />
      <main class="container mx-auto px-4 pb-16">
        <PostList currentPage={currentPage} posts={posts} />
      </main>
    </Layout>
  );
};
