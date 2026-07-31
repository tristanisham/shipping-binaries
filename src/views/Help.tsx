import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import { PostList } from "./components/blog/posts/PostList.js";
import {
  defaultHeaderNav,
  Header,
} from "./components/header/Header.js";
import { toAbsoluteUrl } from "./components/SocialMeta.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type HelpProps = ViewerProps & {
  currentPage?: number;
  posts: readonly PostWithAuthor[];
};

export const Help: FC<HelpProps> = ({
  currentPage = 1,
  isAdmin = false,
  isAuthenticated = false,
  posts,
  viewerUserId = null,
  viewerUsername = null,
}) => {
  const meta: LayoutMeta = {
    canonical: toAbsoluteUrl("/help"),
    description: "Help with Shipping Binaries.",
    title: "Help | Shipping Binaries",
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={defaultHeaderNav}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto px-4 pb-16">
        <h1 class="mx-auto mt-12 w-full max-w-[60rem] text-4xl font-bold">
          Help
        </h1>
        <PostList
          currentPage={currentPage}
          isAdmin={isAdmin}
          pageBasePath="/help"
          posts={posts}
          viewerUserId={viewerUserId}
        />
      </main>
    </Layout>
  );
};
