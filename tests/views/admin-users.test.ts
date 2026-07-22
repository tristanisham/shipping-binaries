import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminUsers } from "../../src/views/AdminUsers.js";

test("users table edits identity fields in place across the full width", () => {
  const html = renderToString(AdminUsers({
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

  assert.match(html, /<table class="w-full table-fixed/);
  assert.match(html, /<th[^>]*>Label<\/th>[\s\S]*<th[^>]*>Username<\/th>/);
  assert.match(html, /id="user-1-identity"[^>]*method="post"/);
  assert.match(html, /name="label"[^>]*value="Site Owner"/);
  assert.match(html, /form="user-1-identity"[^>]*name="username"/);
  assert.match(html, /form="user-1-identity"[^>]*name="email"/);
  assert.match(html, /text-amber-50 dark:text-mist-600/);
  assert.match(html, /capitalize !text-amber-50/);
  assert.match(html, /justify-end gap-2/);
});
