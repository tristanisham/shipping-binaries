import type { FC } from "hono/jsx";
import { BLOG_FEED_PATHS } from "../../../feeds/feed.js";
import { SITE_NAME, toAbsoluteUrl } from "../SocialMeta.js";
import { Button } from "../ui/Button.js";

type FeedCardProps = {
  postSlug: string;
};

// The header's checkerboard strip, reused so the card reads as site chrome
// rather than an unrelated panel. Squares are the panel's text color.
const checkerStrip =
  "pointer-events-none absolute inset-x-0 top-0 h-2 bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-amber-50)_25%,transparent_0_50%,var(--color-amber-50)_0_75%,transparent_0)] bg-[length:0.5rem_0.5rem] [background-position:0.25rem_0] dark:bg-[conic-gradient(from_90deg_at_0.25rem_0.25rem,var(--color-mist-600)_25%,transparent_0_50%,var(--color-mist-600)_0_75%,transparent_0)]";

// Hover colors differ per theme so both clear 4.5:1 against the panel:
// chocolate-200 on mist (4.69:1), chocolate-600 on amber (4.58:1).
const feedLinkClass =
  "rounded-xs underline decoration-amber-50/60 underline-offset-4 outline-none transition-colors hover:text-chocolate-200 hover:decoration-chocolate-200 focus-visible:ring-[3px] focus-visible:ring-chocolate-500/40 dark:decoration-mist-600/60 dark:hover:text-chocolate-600 dark:hover:decoration-chocolate-600";

const feedCardScript = `
(() => {
  const card = document.currentScript?.closest("[data-feed-card]");
  if (!card || card.dataset.ready === "true") return;

  card.dataset.ready = "true";

  const button = card.querySelector("[data-feed-copy]");
  const status = card.querySelector("[data-feed-copy-status]");
  const url = card.dataset.feedUrl;
  if (!button || !url) return;

  const label = button.textContent;
  let reset;

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.showToast?.("Select the feed address to copy it.");
      return;
    }

    button.textContent = "Copied";
    if (status) status.textContent = "Feed address copied.";

    clearTimeout(reset);
    reset = setTimeout(() => {
      button.textContent = label;
      if (status) status.textContent = "";
    }, 2000);
  });
})();
`;

export const FeedCard: FC<FeedCardProps> = ({ postSlug }) => {
  const feedUrl = toAbsoluteUrl(BLOG_FEED_PATHS.rss);

  return (
    <section
      aria-labelledby="feed-card-title"
      class="relative mt-12 overflow-hidden rounded-xl bg-mist-600 px-6 pt-10 pb-6 text-amber-50 sm:px-8 sm:pt-12 dark:bg-amber-50 dark:text-mist-600"
      data-feed-card
      data-feed-url={feedUrl}
      id="feed-card"
    >
      <div aria-hidden="true" class={checkerStrip} />

      {
        /* The eyebrow reads as secondary through the mono/uppercase treatment
          rather than through dimming: opacity below 85% drops this panel's
          text under 4.5:1 in dark mode. */
      }
      <p class="font-mono text-xs uppercase tracking-[0.2em] opacity-85">
        Subscribe by feed
      </p>
      <h2
        class="mt-3 font-black-ops-one text-3xl leading-none sm:text-4xl"
        id="feed-card-title"
      >
        Get the next one
      </h2>
      <p class="mt-4 max-w-prose text-sm leading-relaxed opacity-85 sm:text-base">
        Point your feed reader at {SITE_NAME}{" "}
        and every new post arrives on its own. No account, no email address.
      </p>

      <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code class="flex h-11 flex-1 items-center overflow-x-auto rounded-md border border-amber-50/20 bg-amber-50/10 px-3 font-mono text-xs whitespace-nowrap sm:text-sm dark:border-mist-600/20 dark:bg-mist-600/10">
          {feedUrl}
        </code>
        <Button
          class="h-11 sm:w-28"
          data-analytics-event="feed address copied"
          data-feed-copy
          data-post-slug={postSlug}
          variant="tertiary"
        >
          Copy
        </Button>
      </div>
      <p class="sr-only" data-feed-copy-status role="status" />

      <div class="mt-6 flex flex-col gap-2 border-t border-amber-50/15 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-mist-600/15">
        <p>
          Also as{" "}
          <a
            class={feedLinkClass}
            data-analytics-event="feed format opened"
            data-post-slug={postSlug}
            href={BLOG_FEED_PATHS.atom}
          >
            Atom
          </a>{" "}
          or{" "}
          <a
            class={feedLinkClass}
            data-analytics-event="feed format opened"
            data-post-slug={postSlug}
            href={BLOG_FEED_PATHS.json}
          >
            JSON Feed
          </a>.
        </p>
        <p>
          <a
            class={feedLinkClass}
            data-analytics-event="comment sign in opened"
            data-post-slug={postSlug}
            href="/login"
          >
            Sign in
          </a>{" "}
          to comment.
        </p>
      </div>

      <script dangerouslySetInnerHTML={{ __html: feedCardScript }} />
    </section>
  );
};
