import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminHome } from "../../src/views/AdminHome.js";

test("overview includes separate user and role tables", () => {
  const html = renderToString(AdminHome({
    posts: [{
      authorUsername: "owner",
      createdAt: "2026-07-22 12:00:00",
      description: "",
      draft: false,
      id: 1,
      slug: "published-post",
      title: "Published post",
      updatedAt: "2026-07-22 13:00:00",
      userId: 1,
    }],
    roles: [{
      createdAt: "2026-07-22 12:00:00",
      id: 1,
      name: "admin",
      updatedAt: "2026-07-22 12:00:00",
      userCount: 1,
    }],
    users: [{
      active: true,
      createdAt: "2026-07-22 12:00:00",
      email: "owner@example.com",
      id: 1,
      label: "Site Owner",
      roles: ["admin"],
      updatedAt: "2026-07-22 12:00:00",
      username: "owner",
    }],
  }));

  assert.match(html, /id="overview-users-title">Users<\/h2>/);
  assert.match(html, /<table aria-label="Users"/);
  assert.equal(
    html.match(/<tbody class="text-amber-50 dark:text-mist-600">/g)?.length,
    2,
  );
  assert.match(html, /Site Owner/);
  assert.match(html, /owner@example\.com/);
  assert.match(html, /id="overview-roles-title">Roles<\/h2>/);
  assert.match(html, /<table aria-label="Roles"/);
  assert.match(html, />admin<\/td>/);
  assert.match(html, /Manage users \(1\)/);
  assert.match(html, /Manage roles \(1\)/);
  assert.match(
    html,
    /class="[^"]*bg-chocolate-500 text-amber-50[^"]*" href="\/admin\/write">New post<\/a>/,
  );
});
