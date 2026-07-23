import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminUserAccess } from "../../src/views/AdminUserAccess.js";
import type { Role } from "../../src/models/role.js";
import type { User } from "../../src/models/user.js";

const user = {
  id: 2,
  email: "e@example.com",
  username: "member",
  label: "Member",
  active: true,
  roles: ["editor"],
  passwordHash: "",
  createdAt: "",
  updatedAt: "",
} as unknown as User;

test("access page posts roles, denials, and clears to the right routes", () => {
  const html = renderToString(
    AdminUserAccess({
      denials: [{ permissionId: 10, expiresAt: "9999-12-31T23:59:59.999Z" }],
      permissions: [
        { id: 10, name: "comments:create", createdAt: "", updatedAt: "" },
        { id: 11, name: "comments:read", createdAt: "", updatedAt: "" },
      ],
      roles: [{
        id: 1,
        name: "editor",
        createdAt: "",
        updatedAt: "",
      }] as Role[],
      user,
    }),
  );

  assert.ok(html.includes("/admin/users/2/roles"));
  assert.ok(html.includes("/admin/users/2/denials"));
  assert.ok(html.includes("/admin/users/2/denials/10/delete")); // clear denied perm
  assert.ok(html.includes("comments:create"));
});
