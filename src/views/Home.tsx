import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import { Layout, LayoutMeta } from "./layouts/MainLayout.js";
import { PostList } from "./components/blog/posts/PostList.js";
import { toAbsoluteUrl } from "./components/SocialMeta.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";

type HomeProps = ViewerProps & {
  currentPage?: number;
  posts?: readonly PostWithAuthor[];
};

export const Home: FC<HomeProps> = (
  { currentPage = 1, isAdmin = false, isAuthenticated = false, posts = [] },
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
    canonical: toAbsoluteUrl("/"),
    social: {
      title: "Shipping Binaries",
    },
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/")}
      />
      <main class="mx-auto w-full max-w-4xl px-4 pb-16">
        <PostList
          currentPage={currentPage}
          pageBasePath="/"
          posts={posts}
        />
      </main>
    </Layout>
  );
};
