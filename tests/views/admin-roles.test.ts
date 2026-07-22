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
  assert.match(html, /action="\/admin\/roles"/);
  assert.match(html, /name="name"[^>]*placeholder="editor"/);
  assert.match(
    html,
    /<input(?=[^>]*disabled)(?=[^>]*value="admin")[^>]*>/,
  );
  assert.match(html, />Protected<\/span>/);
  assert.match(html, /action="\/admin\/roles\/2"/);
  assert.match(html, /action="\/admin\/roles\/2\/delete"/);
});
