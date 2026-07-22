import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminRoles } from "../../src/views/AdminRoles.js";

test("roles page protects admin and edits custom roles in place", () => {
  const html = renderToString(AdminRoles({
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
  }));

  assert.match(html, /aria-current="page"[^>]*href="\/admin\/roles"/);
  assert.match(html, /aria-label="Current roles"/);
  assert.match(html, /aria-label="Edit role admin"[^>]*href="#role-1"/);
  assert.match(html, /aria-label="Edit role writer"[^>]*href="#role-2"/);
  assert.match(html, /Click on a role to edit it/);
  assert.match(html, /action="\/admin\/roles"/);
  assert.equal(
    html.match(/oninput="this\.value = this\.value\.toLowerCase\(\)"/g)
      ?.length,
    3,
  );
  assert.match(html, /name="name"[^>]*placeholder="editor"/);
  assert.match(
    html,
    /<input(?=[^>]*disabled)(?=[^>]*value="admin")[^>]*>/,
  );
  assert.match(html, />Protected<\/span>/);
  assert.match(html, /action="\/admin\/roles\/2"/);
  assert.match(html, /id="role-2"/);
  assert.match(html, /action="\/admin\/roles\/2\/delete"/);
});
