import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { FeedCard } from "../../src/views/components/blog/FeedCard.js";
import { BLOG_FEED_PATHS } from "../../src/feeds/feed.js";

test("feed card offers the RSS address with every alternate format", () => {
  const html = renderToString(FeedCard({ postSlug: "a-post" }));

  assert.match(html, /data-feed-url="https:\/\/shippingbinaries\.com\/rss"/);
  assert.match(html, />https:\/\/shippingbinaries\.com\/rss</);
  assert.match(html, new RegExp(`href="${BLOG_FEED_PATHS.atom}"`));
  assert.match(html, new RegExp(`href="${BLOG_FEED_PATHS.json}"`));
  assert.match(html, /href="\/login"/);
});

test("feed card reports copy results to assistive technology", () => {
  const html = renderToString(FeedCard({ postSlug: "a-post" }));

  assert.match(html, /aria-labelledby="feed-card-title"/);
  assert.match(html, /id="feed-card-title"/);
  assert.match(html, /role="status"/);
  // The decorative checkerboard edge must not reach the accessibility tree.
  assert.match(html, /aria-hidden="true"[^>]*pointer-events-none/);
});

test("feed card keeps panel text above the 4.5:1 contrast floor", () => {
  const html = renderToString(FeedCard({ postSlug: "a-post" }));

  // opacity-75 measures 3.87:1 for mist-600 on amber-50 in dark mode. The
  // shared Button's `disabled:opacity-50` is exempt, so ignore that prefix.
  assert.doesNotMatch(html, /(?<!disabled:)opacity-(?:[1-7][0-9]?|80)\b/);
  // chocolate-300 measures 3.69:1 against the light panel's mist-600.
  assert.doesNotMatch(html, /hover:text-chocolate-300/);
});

test("feed card tracks copy and format conversions through PostHog", () => {
  const html = renderToString(FeedCard({ postSlug: "a-post" }));

  assert.match(html, /data-analytics-event="feed address copied"/);
  assert.match(html, /data-analytics-event="feed format opened"/);
  assert.equal(html.match(/data-post-slug="a-post"/g)?.length, 4);
});
