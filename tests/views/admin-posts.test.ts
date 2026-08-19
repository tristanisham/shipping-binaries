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
    /data-slot="card-action"[\s\S]*?<a class="[^"]*bg-chocolate-500 text-amber-50[^"]*" href="\/admin\/write">New Post<\/a>/,
  );
  // The export control sits to the left of New Post.
  assert.ok(
    html.indexOf("data-post-export-open") <
      html.indexOf('href="/admin/write">New Post'),
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

const post = (
  overrides: Partial<Parameters<typeof AdminPosts>[0]["posts"][number]> = {},
) => ({
  authorUsername: "owner",
  createdAt: "2026-07-22 12:00:00",
  description: "",
  draft: false,
  id: 3,
  slug: "live-post",
  title: "Live post",
  updatedAt: "2026-07-22 12:00:00",
  userId: 1,
  ...overrides,
});

test("the posts page offers a bulk export dialog", () => {
  const html = renderToString(AdminPosts({ posts: [post()] }));

  // The same export glyph the editor uses.
  assert.match(
    html,
    /aria-label="Export posts"[\s\S]*?<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2\.4 2\.4 0 0 1 1\.704\.706/,
  );
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /onclick="window\.openPostExport\(\)"/);

  assert.match(html, /<dialog[^>]*aria-labelledby="post-export-title"/);
  assert.match(html, /data-post-export-dialog/);
  assert.match(html, /<h2[^>]*id="post-export-title">Export posts<\/h2>/);
  for (const value of ["all", "private", "public"]) {
    assert.match(
      html,
      new RegExp(`name="post-export-scope"[^>]*value="${value}"`),
    );
  }
  for (const value of ["zip", "targz"]) {
    assert.match(
      html,
      new RegExp(`name="post-export-format"[^>]*value="${value}"`),
    );
  }
  assert.match(html, /aria-live="polite"[\s\S]*?data-post-export-status/);
  assert.match(html, /data-post-export-download/);
  assert.match(html, /data-post-export-cancel/);
  // Inverse admin panel palette, like the rest of the section.
  assert.match(html, /bg-mist-600 text-amber-50 dark:bg-amber-50/);

  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source?.includes("window.openPostExport"));
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /showSaveFilePicker/);
  assert.match(script, /dialog\.showModal\(\)/);
  assert.match(script, /\/admin\/posts\/export\?scope=/);
});

test("only an admin gets the author selection", () => {
  const posts = [
    post({ authorUsername: "owner", id: 1, slug: "a", userId: 1 }),
    post({ authorUsername: "author", id: 2, slug: "b", userId: 2 }),
    // A second post by the same author must not duplicate the option.
    post({ authorUsername: "author", id: 3, slug: "c", userId: 2 }),
  ];

  const admin = renderToString(
    AdminPosts({ isAdmin: true, posts, viewerId: 1 }),
  );
  assert.match(admin, /<legend[^>]*>Whose posts<\/legend>/);
  for (const value of ["mine", "all", "list"]) {
    assert.match(
      admin,
      new RegExp(`name="post-export-authors"[^>]*value="${value}"`),
    );
  }
  // The list is labelled, hidden and disabled until "Specific authors".
  assert.match(admin, /for="post-export-author-list"/);
  assert.match(admin, /<select[^>]*multiple[^>]*>/);
  assert.match(admin, /id="post-export-author-list"/);
  assert.match(admin, /data-post-export-author-field="true" hidden=""/);
  assert.match(admin, /<select[^>]*disabled=""/);
  // Sorted, deduplicated, and the viewer is named as such.
  assert.deepEqual(
    [...admin.matchAll(/<option value="(\d+)">([^<]*)<\/option>/g)]
      .map((match) => [match[1], match[2]]),
    [["2", "author"], ["1", "owner (you)"]],
  );

  const author = renderToString(AdminPosts({ posts, viewerId: 2 }));
  assert.doesNotMatch(author, /Whose posts/);
  // The shared script still mentions the control; the markup must not.
  assert.doesNotMatch(author, /<input[^>]*name="post-export-authors"/);
  assert.doesNotMatch(author, /<select/);
  assert.doesNotMatch(author, /id="post-export-author-list"/);
  // Scope and compression stay.
  assert.match(author, /name="post-export-scope"/);
  assert.match(author, /name="post-export-format"/);
});

test("posts without an author of their own add no option", () => {
  const html = renderToString(AdminPosts({
    isAdmin: true,
    posts: [post({ authorUsername: "solo", userId: 9 })],
    viewerId: 9,
  }));

  assert.deepEqual(
    [...html.matchAll(/<option value="(\d+)">/g)].map((match) => match[1]),
    ["9"],
  );
});
