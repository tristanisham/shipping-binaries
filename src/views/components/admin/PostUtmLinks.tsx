import type { FC } from "hono/jsx";
import { SITE_ORIGIN } from "../SocialMeta.js";
import { buttonVariants } from "../ui/Button.js";
import { cn } from "../ui/utils.js";
import { panelOutlineButton, panelSurface } from "./panel.js";

export type PostUtmSource = "bluesky" | "copy_link" | "facebook" | "x";

const sourceMedium: Record<PostUtmSource, "referral" | "social"> = {
  bluesky: "social",
  copy_link: "referral",
  facebook: "social",
  x: "social",
};

export const postUtmUrl = (
  slug: string,
  source: PostUtmSource,
): string => {
  const url = new URL(`/blog/${slug}`, SITE_ORIGIN);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", sourceMedium[source]);
  url.searchParams.set("utm_campaign", "post_share");
  return url.toString();
};

const copyHandler = (
  url: string,
  message: string,
): string =>
  `window.copyPostUtmLink(this,${JSON.stringify(url)},${JSON.stringify(message)})`;

const menuButtonClass = cn(
  buttonVariants({ size: "sm", variant: "outline" }),
  panelOutlineButton,
);

type PostUtmLinksProps = {
  postId: number;
  slug: string;
  title: string;
};

export const PostUtmLinks: FC<PostUtmLinksProps> = ({
  postId,
  slug,
  title,
}) => {
  const menuId = `post-utm-menu-${postId}`;

  return (
    <div class="relative" data-post-utm-links>
      <button
        aria-controls={menuId}
        aria-expanded="false"
        aria-label={`Open UTM links for ${title}`}
        class={menuButtonClass}
        data-post-utm-toggle
        onclick="window.togglePostUtmLinks(this)"
        title="UTM links"
        type="button"
      >
        <svg
          aria-hidden="true"
          class="size-4 fill-none stroke-current"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>

      <div
        aria-label={`Copy UTM link for ${title}`}
        class={`absolute right-0 bottom-[calc(100%+0.5rem)] z-20 flex items-center gap-1 rounded-lg border border-amber-50/25 p-2 shadow-xl dark:border-mist-600/25 ${panelSurface}`}
        hidden
        id={menuId}
        role="group"
        data-post-utm-menu
      >
        <button
          aria-label={`Copy generic UTM link for ${title}`}
          class={menuButtonClass}
          onclick={copyHandler(
            postUtmUrl(slug, "copy_link"),
            "UTM link copied!",
          )}
          title="Copy link"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4 fill-none stroke-current"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        <button
          aria-label={`Copy X UTM link for ${title}`}
          class={menuButtonClass}
          onclick={copyHandler(postUtmUrl(slug, "x"), "X UTM link copied!")}
          title="Copy X link"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
          </svg>
        </button>
        <button
          aria-label={`Copy Facebook UTM link for ${title}`}
          class={menuButtonClass}
          onclick={copyHandler(
            postUtmUrl(slug, "facebook"),
            "Facebook UTM link copied!",
          )}
          title="Copy Facebook link"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
          </svg>
        </button>
        <button
          aria-label={`Copy Bluesky UTM link for ${title}`}
          class={menuButtonClass}
          onclick={copyHandler(
            postUtmUrl(slug, "bluesky"),
            "Bluesky UTM link copied!",
          )}
          title="Copy Bluesky link"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const postUtmLinksScript = `
(() => {
  const closeMenu = (root, restoreFocus = false) => {
    const menu = root?.querySelector("[data-post-utm-menu]");
    const toggle = root?.querySelector("[data-post-utm-toggle]");
    if (!menu || !toggle || menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  };

  window.togglePostUtmLinks = (toggle) => {
    const root = toggle.closest("[data-post-utm-links]");
    const menu = root?.querySelector("[data-post-utm-menu]");
    if (!root || !menu) return;
    const willOpen = menu.hidden;
    document.querySelectorAll("[data-post-utm-links]").forEach((candidate) => {
      if (candidate !== root) closeMenu(candidate);
    });
    menu.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", String(willOpen));
  };

  window.copyPostUtmLink = (button, url, message) => {
    closeMenu(button.closest("[data-post-utm-links]"));
    void window.copyWithToast(url, message);
  };

  document.addEventListener("click", (event) => {
    document.querySelectorAll("[data-post-utm-links]").forEach((root) => {
      if (!root.contains(event.target)) closeMenu(root);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll("[data-post-utm-links]").forEach((root) => {
      closeMenu(root, true);
    });
  });
})();
`;

export const PostUtmLinksScript: FC = () => (
  <script dangerouslySetInnerHTML={{ __html: postUtmLinksScript }} />
);
