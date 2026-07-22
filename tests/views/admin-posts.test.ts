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
});
