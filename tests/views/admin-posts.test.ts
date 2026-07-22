import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminPosts } from "../../src/views/AdminPosts.js";

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
  assert.match(html, /M10\.114 4\.462A14\.5 14\.5/);
  assert.match(html, /<path d="m2 2 20 20"><\/path>/);
  assert.doesNotMatch(html, />Unpublish<\/button>/);
});
