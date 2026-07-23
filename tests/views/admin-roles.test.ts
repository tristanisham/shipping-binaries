import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminRoles } from "../../src/views/AdminRoles.js";

test("roles page selects a role and manages its permissions", () => {
  const html = renderToString(AdminRoles({
    permissions: [
      {
        createdAt: "2026-07-23 12:00:00",
        id: 1,
        name: "posts:update",
        updatedAt: "2026-07-23 12:00:00",
      },
      {
        createdAt: "2026-07-23 12:00:00",
        id: 2,
        name: "users:read",
        updatedAt: "2026-07-23 12:00:00",
      },
    ],
    roles: [
      {
        createdAt: "2026-07-22 12:00:00",
        id: 1,
        name: "admin",
        updatedAt: "2026-07-22 12:00:00",
        userCount: 1,
      },
      {
        createdAt: "2026-07-22 12:00:00",
        id: 2,
        name: "writer",
        updatedAt: "2026-07-22 12:00:00",
        userCount: 2,
      },
    ],
    selectedPermissionIds: [1],
    selectedRoleId: 2,
  }));

  assert.match(html, /aria-current="page"[^>]*href="\/admin\/roles"/);
  assert.match(html, /aria-label="Current roles"/);
  assert.match(
    html,
    /aria-label="Select role admin"[^>]*href="\/admin\/roles\?role=1"/,
  );
  assert.match(
    html,
    /aria-current="true"[^>]*aria-label="Select role writer"/,
  );
  assert.match(html, /Select a role to manage its permissions/);
  assert.match(html, /action="\/admin\/roles"/);
  assert.match(html, /name="name"[^>]*placeholder="editor"/);

  assert.match(html, /id="selected-role-heading">writer<\/h2>/);
  assert.match(html, />2 accounts<\/span>/);
  assert.match(html, /aria-label="Permissions assigned to writer"/);
  assert.match(
    html,
    /action="\/admin\/roles\/2\/permissions\/1"[^>]*method="post"/,
  );
  assert.match(html, /aria-label="Remove permission posts:update"/);
  assert.match(html, /aria-label="Search permissions"/);
  assert.match(html, /x-model="query"/);
  assert.match(html, /aria-label="Toggle permission posts:update"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /data-selected="true"/);
  assert.match(
    html,
    /data-\[selected=true\]:bg-chocolate-500/,
  );
  assert.match(html, /bg-amber-50\/10 p-4 dark:bg-mist-600\/10/);
  assert.match(
    html,
    /aria-label="Drag permission posts:update to assigned permissions"/,
  );
  assert.match(html, /cursor-grab/);
  assert.match(html, /x-on:dragstart\.stop="startDrag\(1, \$event\)"/);
  assert.match(html, /x-on:drop\.prevent="dropPermission\(\$event\)"/);
  assert.match(html, /<path d="M20 6 9 17l-5-5"><\/path>/);
  assert.match(html, />posts<\/span>.*:.*>update<\/span>/s);

  assert.match(html, /action="\/admin\/roles\/2"/);
  assert.match(html, /action="\/admin\/roles\/2\/delete"/);
  assert.match(html, /action="\/admin\/roles\/permissions\?role=2"/);
  assert.match(html, /placeholder="posts:publish"/);
  assert.match(html, />Add permission<\/button>/);
});
