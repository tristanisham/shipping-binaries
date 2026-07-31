import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminPosts } from "../../src/views/AdminPosts.js";
import { postUtmUrl } from "../../src/views/components/admin/PostUtmLinks.js";

test("post UTM links identify their source and campaign", () => {
  assert.equal(
    postUtmUrl("live-post", "copy_link"),
    "https://shippingbinaries.com/blog/live-post?utm_source=copy_link&utm_medium=referral&utm_campaign=post_share",
  );
  assert.equal(
    postUtmUrl("live-post", "x"),
    "https://shippingbinaries.com/blog/live-post?utm_source=x&utm_medium=social&utm_campaign=post_share",
  );
  assert.equal(
    postUtmUrl("live-post", "facebook"),
    "https://shippingbinaries.com/blog/live-post?utm_source=facebook&utm_medium=social&utm_campaign=post_share",
  );
  assert.equal(
    postUtmUrl("live-post", "bluesky"),
    "https://shippingbinaries.com/blog/live-post?utm_source=bluesky&utm_medium=social&utm_campaign=post_share",
  );
});

test("post edit actions use an accessible pencil icon", () => {
  const html = renderToString(AdminPosts({
    posts: [{
      authorUsername: "owner",
      createdAt: "2026-07-22 12:00:00",
      description: "",
      draft: true,
      id: 1,
      slug: "draft-post",
      title: "Draft post",
      updatedAt: "2026-07-22 12:00:00",
      userId: 1,
    }],
  }));

  assert.match(html, /aria-label="Edit Draft post"/);
  assert.match(html, /title="Edit Draft post"/);
  assert.match(html, /<path d="M16\.5 3\.5a2\.12 2\.12/);
  assert.doesNotMatch(html, />Edit<\/a>/);
  assert.match(html, /data-variant="primary"/);
  assert.match(html, /bg-amber-50 text-mist-600/);
  assert.match(html, /hover:bg-chocolate-500 hover:text-amber-50/);
  assert.match(html, /aria-label="Publish Draft post"/);
  assert.match(html, /title="Publish Draft post"/);
  assert.match(html, /<path d="m15 6 2 2 4-4"><\/path>/);
  assert.match(html, /M2 12h20A10 10 0 1 1 12 2/);
  assert.doesNotMatch(html, />Publish<\/button>/);
  assert.match(html, /<th class="py-2 font-medium text-right">Actions<\/th>/);
  assert.match(html, /class="flex items-center justify-end gap-2"/);
  assert.match(
    html,
    /data-slot="card-action"[^>]*><a class="[^"]*bg-chocolate-500 text-amber-50[^"]*" href="\/admin\/write">New Post<\/a>/,
  );
  assert.doesNotMatch(html, /Open UTM links for Draft post/);
});

test("published posts use the globe-off unpublish action", () => {
  const html = renderToString(AdminPosts({
    posts: [{
      authorUsername: "owner",
      createdAt: "2026-07-22 12:00:00",
      description: "",
      draft: false,
      id: 2,
      slug: "live-post",
      title: "Live post",
      updatedAt: "2026-07-22 12:00:00",
      userId: 1,
    }],
  }));

  assert.match(html, /aria-label="Unpublish Live post"/);
  assert.match(html, /title="Unpublish Live post"/);
  assert.match(html, /data-variant="danger"/);
  assert.match(html, /bg-burgundy-700 text-amber-50/);
  assert.match(html, /dark:bg-burgundy-400 dark:text-amber-50/);
  assert.match(html, /M10\.114 4\.462A14\.5 14\.5/);
  assert.match(html, /<path d="m2 2 20 20"><\/path>/);
  assert.doesNotMatch(html, />Unpublish<\/button>/);

  assert.match(html, /aria-label="Open UTM links for Live post"/);
  assert.match(html, /data-post-utm-menu/);
  assert.match(html, /flex items-center gap-1/);
  assert.match(html, /aria-label="Copy generic UTM link for Live post"/);
  assert.match(html, /aria-label="Copy X UTM link for Live post"/);
  assert.match(html, /aria-label="Copy Facebook UTM link for Live post"/);
  assert.match(html, /aria-label="Copy Bluesky UTM link for Live post"/);
  assert.match(html, /M10 13a5 5 0 0 0 7\.54\.54l3-3/);
  assert.match(html, /M14\.234 10\.162 22\.977 0h-2\.072/);
  assert.match(html, /M9\.101 23\.691v-7\.98/);
  assert.match(html, /M5\.202 2\.857C7\.954 4\.922/);

  const genericIndex = html.indexOf("Copy generic UTM link");
  const xIndex = html.indexOf("Copy X UTM link");
  const facebookIndex = html.indexOf("Copy Facebook UTM link");
  const blueskyIndex = html.indexOf("Copy Bluesky UTM link");
  assert.ok(genericIndex < xIndex);
  assert.ok(xIndex < facebookIndex);
  assert.ok(facebookIndex < blueskyIndex);

  const menuScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((script) => script.includes("window.togglePostUtmLinks"));
  assert.ok(menuScript);
  assert.doesNotThrow(() => new Function(menuScript));
  assert.match(menuScript, /window\.copyWithToast\(url, message\)/);
  assert.match(menuScript, /!root\.contains\(event\.target\)/);
  assert.match(menuScript, /event\.key !== "Escape"/);
});
