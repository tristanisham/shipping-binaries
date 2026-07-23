import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import type { PublicProfile } from "../models/profile.js";
import { PostGrid } from "./components/blog/posts/PostGrid.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";
import { toAbsoluteUrl } from "./components/SocialMeta.js";

type AuthorProps = ViewerProps & {
  author: PublicProfile;
  currentPage?: number;
  posts: readonly PostWithAuthor[];
};

export const Author: FC<AuthorProps> = ({
  author,
  currentPage = 1,
  isAdmin = false,
  isAuthenticated = false,
  posts,
  viewerUsername = null,
}) => {
  const displayName = author.label ?? author.username;
  const meta: LayoutMeta = {
    title: `${displayName} | Shipping Binaries`,
    description: `Posts by ${displayName} on Shipping Binaries.`,
    canonical: toAbsoluteUrl(`/@${encodeURIComponent(author.username)}`),
    social: {
      title: `${displayName} Author’s Page`,
    },
  };

  return (
    <Layout meta={meta}>
      <Header
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        nav={setCurrentNavItem(defaultHeaderNav, "/blog")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto px-4 pb-16">
        <header class="mt-10">
          <h1 class="font-black-ops-one text-2xl leading-none">
            {displayName}
          </h1>
          <p class="mt-1 text-sm leading-none opacity-70">
            @{author.username}
          </p>
          {author.biography
            ? (
              <p class="mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed">
                {author.biography}
              </p>
            )
            : null}
        </header>
        <hr class="mt-6 border-mist-600/25 dark:border-amber-50/25" />
        <PostGrid
          class="mx-auto mt-8 max-w-[60rem]"
          currentPage={currentPage}
          pageBasePath={`/@${encodeURIComponent(author.username)}`}
          posts={posts}
        />
      </main>
    </Layout>
  );
};
