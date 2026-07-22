import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../models/post.js";
import type { PublicUser } from "../models/user.js";
import { PostList } from "./components/blog/posts/PostList.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AuthorProps = {
  author: PublicUser;
  currentPage?: number;
  isAuthenticated?: boolean;
  posts: readonly PostWithAuthor[];
};

export const Author: FC<AuthorProps> = ({
  author,
  currentPage = 1,
  isAuthenticated = false,
  posts,
}) => {
  const displayName = author.label ?? author.username;
  const meta: LayoutMeta = {
    title: `${displayName} | Shipping Binaries`,
    description: `Posts by ${displayName} on Shipping Binaries.`,
  };

  return (
    <Layout meta={meta}>
      <Header
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/blog")}
      />
      <main class="container mx-auto px-4 pb-16">
        <header class="mt-12">
          <h1 class="font-black-ops-one text-4xl">{displayName}</h1>
          <p class="mt-2 opacity-70">@{author.username}</p>
        </header>
        <PostList
          currentPage={currentPage}
          pageBasePath={`/@${encodeURIComponent(author.username)}`}
          posts={posts}
        />
      </main>
    </Layout>
  );
};
