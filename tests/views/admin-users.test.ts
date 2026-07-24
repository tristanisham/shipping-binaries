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
  assert.ok(
    html.indexOf('id="new-user-row"') < html.indexOf('id="user-1-identity"'),
  );
  assert.match(html, /id="user-1-identity"[^>]*method="post"/);
  assert.match(html, /name="label"[^>]*value="Site Owner"/);
  assert.match(html, /form="user-1-identity"[^>]*name="username"/);
  assert.match(html, /form="user-1-identity"[^>]*name="email"/);
  assert.match(html, />admin<\/span>/);
  assert.match(html, /text-amber-50 dark:text-mist-600/);
  assert.match(html, /capitalize disabled:opacity-100/);
  assert.match(html, /data-variant="primary"/);
  assert.match(html, /hover:bg-chocolate-500 hover:text-amber-50/);
  assert.match(html, /aria-label="Save owner"/);
  assert.match(html, /x-on:submit\.prevent=/);
  assert.match(html, /x-bind:data-variant=/);
  assert.match(html, /data-save-icon="save"/);
  assert.match(html, /data-save-icon="check"/);
  assert.match(html, /data-save-icon="error"/);
  assert.match(html, /<path d="M17 21v-7a1 1 0 0 0-1-1H8/);
  assert.doesNotMatch(html, />Save<\/button>/);
  assert.match(html, /justify-end gap-2/);
  assert.match(html, /aria-label="Deactivate owner"/);
  assert.match(
    html,
    /bg-burgundy-700 text-amber-50 hover:bg-burgundy-600 dark:bg-burgundy-400/,
  );
  assert.doesNotMatch(html, />Deactivate<\/button>/);
});

test("users table shows role badges and a manage-access link, not checkboxes", () => {
  const html = renderToString(AdminUsers({
    users: [{
      active: true,
      createdAt: "",
      email: "e@example.com",
      id: 2,
      label: "Member",
      roles: ["editor"],
      updatedAt: "",
      username: "member",
    }],
  }));

  assert.ok(html.includes("/admin/users/2/permissions"));
  assert.ok(html.includes(">editor<")); // role badge text
  assert.ok(!html.includes('name="roleIds"')); // no inline checkboxes
});
