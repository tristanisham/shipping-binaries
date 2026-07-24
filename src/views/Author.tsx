import type { FC } from "hono/jsx";
import type { ViewerProps } from "../auth/viewer.js";
import type { PostWithAuthor } from "../models/post.js";
import {
  MAX_PROFILE_BIOGRAPHY_LENGTH,
  type PublicProfile,
} from "../models/profile.js";
import { PostGrid } from "./components/blog/posts/PostGrid.js";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { Button } from "./components/ui/Button.js";
import { Textarea } from "./components/ui/Textarea.js";
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
  const canEditBiography = isAuthenticated &&
    viewerUsername === author.username;
  const meta: LayoutMeta = {
    alpine: canEditBiography,
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
        <div class="mx-auto max-w-[60rem]">
          <header class="mt-10">
            <h1 class="font-black-ops-one text-2xl leading-none">
              {displayName}
            </h1>
            <p class="mt-1 text-sm leading-none opacity-70">
              @{author.username}
            </p>
            {(author.biography || canEditBiography) && (
              <div
                class="mt-4 w-full"
                {...(canEditBiography
                  ? { "x-data": "{ editingBiography: false }" }
                  : {})}
              >
                {author.biography && (
                  <p
                    class="whitespace-pre-wrap leading-relaxed"
                    {...(canEditBiography
                      ? { "x-show": "!editingBiography" }
                      : {})}
                  >
                    {author.biography}
                  </p>
                )}
                {canEditBiography && (
                  <>
                    <Button
                      class={author.biography ? "mt-3" : ""}
                      data-edit-biography
                      size="sm"
                      type="button"
                      variant="outline"
                      {...{
                        "x-on:click":
                          "editingBiography = true; $nextTick(() => $refs.biography.focus())",
                        "x-show": "!editingBiography",
                      }}
                    >
                      {author.biography ? "Edit biography" : "Add biography"}
                    </Button>
                    <form
                      action="/admin/account/biography"
                      class="space-y-3"
                      data-biography-form
                      method="post"
                      style="display: none"
                      {...{ "x-show": "editingBiography" }}
                    >
                      <label class="block">
                        <span class="sr-only">Biography</span>
                        <Textarea
                          class="min-h-32 resize-y"
                          maxlength={MAX_PROFILE_BIOGRAPHY_LENGTH}
                          name="biography"
                          placeholder="Tell readers about yourself."
                          rows={5}
                          {...{ "x-ref": "biography" }}
                        >
                          {author.biography}
                        </Textarea>
                      </label>
                      <div class="flex items-center gap-2">
                        <Button
                          size="sm"
                          type="submit"
                          variant="tertiary"
                        >
                          Save biography
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          {...{
                            "x-on:click":
                              "editingBiography = false; $refs.biography.value = $refs.biography.defaultValue",
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </header>
          <hr class="mt-6 border-mist-600/25 dark:border-amber-50/25" />
        </div>
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
