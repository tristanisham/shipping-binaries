import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminUsers } from "../../src/views/AdminUsers.js";

test("users table edits identity fields in place across the full width", () => {
  const html = renderToString(AdminUsers({
    direction: "asc",
    sort: "username",
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
  assert.match(html, /sort=label&amp;direction=asc/);
  assert.match(html, /aria-sort="ascending"/);
  assert.match(html, /sort=username&amp;direction=desc/);
  assert.match(html, /sort=email&amp;direction=asc/);
  assert.match(html, /sort=status&amp;direction=asc/);
  assert.match(html, /aria-label="Add user"/);
  assert.match(html, /aria-controls="new-user-row"/);
  assert.match(html, /id="new-user-row"/);
  assert.match(html, /action="\/admin\/users" id="new-user-form"/);
  assert.doesNotMatch(html, /form="new-user-form"[^>]*name="password"/);
  assert.match(html, />Invitation<\/span>/);
  assert.match(html, /aria-label="Send invitation"/);
  assert.ok(html.indexOf('id="new-user-row"') < html.indexOf('id="user-1-identity"'));
  assert.match(html, /id="user-1-identity"[^>]*method="post"/);
  assert.match(html, /name="label"[^>]*value="Site Owner"/);
  assert.match(html, /form="user-1-identity"[^>]*name="username"/);
  assert.match(html, /form="user-1-identity"[^>]*name="email"/);
  assert.match(html, /text-amber-50 dark:text-mist-600/);
  assert.match(html, /capitalize !text-amber-50/);
  assert.match(html, /aria-label="Save owner"/);
  assert.match(html, /<path d="M17 21v-7a1 1 0 0 0-1-1H8/);
  assert.doesNotMatch(html, />Save<\/button>/);
  assert.match(html, /justify-end gap-2/);
});
