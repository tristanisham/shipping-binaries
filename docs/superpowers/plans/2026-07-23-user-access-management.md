# User Access Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `author`/`editor` roles and a per-user permission-denial layer (permanent or self-expiring "snooze"), managed from a consolidated `/admin/users/:id/permissions` page, and make `Permission` a fully class-based API.

**Architecture:** Denials live in a new `user_permission_denials` table and are folded into the existing `Permission.can` query as a `NOT EXISTS` clause compared against a JS-generated ISO `now` (the `auth_tokens` expiry pattern). Deny-only semantics: `can = roleGrants AND NOT activeDenial`. Indefinite = a far-future sentinel timestamp; snooze = a nearer future timestamp; clear = delete the row. Role assignment moves off the Users table onto the new page.

**Tech Stack:** Hono + Hono JSX (TypeScript), Cloudflare Workers, D1 (SQLite), node:test with the in-memory D1 adapter in `tests/helpers/d1.ts`.

## Global Constraints

- Strict TypeScript, two-space indent; keep `.js` extensions on relative imports.
- JSX is Hono JSX (`class`, lowercase handlers), not React.
- D1 prepared statements use `?1`-style bindings; tables are `STRICT`.
- Timestamps for expiry are ISO 8601 via `new Date(...).toISOString()`, compared against a JS-bound ISO `now` — never `CURRENT_TIMESTAMP` (matches `models/authToken.ts`).
- Models convention elsewhere is plain functions, but per the approved spec `models/permission.ts` is the deliberate exception: one `Permission` class, all static methods.
- Run `npm run typecheck` and `npm test` after each task; format touched files with `deno fmt <files>`. Never hand-edit `public/styles.css`.
- Admin routes are guarded per-handler with `Permission.require(...)`; the blanket admin gate is gone.
- Spec: `docs/superpowers/specs/2026-07-23-user-access-management-design.md`.

---

### Task 1: Refactor `Permission` to a fully class-based API

Mechanical rename: every free function in `models/permission.ts` becomes a static method on `Permission`. No behavior change. This lands first so later tasks add methods to the class directly.

**Files:**
- Modify: `src/models/permission.ts` (convert all exported functions to static methods)
- Modify: `src/routes/auth.tsx` (call sites + import)
- Modify: `tests/models/permission.test.ts`, `tests/routes/permissions.test.ts` (call sites + import)

**Interfaces:**
- Produces (new static methods, same params/returns as the old functions):
  - `Permission.all(db)` ← `getAllPermissions`
  - `Permission.create(db, name)` ← `createPermission`
  - `Permission.byId(db, id)` ← `getPermissionById`
  - `Permission.forRole(db, roleId)` ← `getPermissionsForRole`
  - `Permission.forUser(db, userId)` ← `getPermissionsForUser`
  - `Permission.assignToRole(db, roleId, permissionName)` ← `assignPermissionToRole`
  - `Permission.setForRole(db, roleId, permissionId, assigned)` ← `setPermissionForRole`
  - unchanged: `Permission.can/.cannot/.require/.requireAny`
  - `PermissionRecord` type and the `*_PERMISSION` name constants stay exported as before.

- [ ] **Step 1: Convert the free functions into static methods.**

In `src/models/permission.ts`, move each `export const getX = async (...) => {...}` into the `Permission` class as `static async x(...) {...}` with the identical body. Example — `getAllPermissions` becomes:

```ts
static async all(db: D1Database): Promise<readonly PermissionRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, name, created_at, updated_at
       FROM permissions
       ORDER BY name ASC`,
    )
    .all<PermissionRow>();
  return result.results.map(permissionFromRow);
}
```

Do the same for `create`, `byId`, `forRole`, `forUser`, `assignToRole`, `setForRole` (bodies copied verbatim, only the declaration form changes). Delete the old `export const` versions. Keep `permissionFromRow`/`PermissionRow` as module-private helpers and `PermissionRecord` + the name constants exported.

- [ ] **Step 2: Update every call site.**

Find them:

```bash
grep -rnE "getAllPermissions|createPermission|getPermissionById|getPermissionsForRole|getPermissionsForUser|assignPermissionToRole|setPermissionForRole" src tests
```

Rewrite each call to the method form (e.g. `getPermissionsForRole(db, id)` → `Permission.forRole(db, id)`) and drop the now-removed names from each `import { … } from ".../permission.js"` list, keeping `Permission` and any `*_PERMISSION` constants. In `tests/*`, add `Permission` to the import where a renamed function was used.

- [ ] **Step 3: Typecheck.**

Run: `npm run typecheck`
Expected: no errors (all old names resolved to methods).

- [ ] **Step 4: Run the full suite — behavior must be unchanged.**

Run: `npm test`
Expected: same pass count as before this task (96 tests pass, 0 fail).

- [ ] **Step 5: Format and commit.**

```bash
deno fmt src/models/permission.ts src/routes/auth.tsx tests/models/permission.test.ts tests/routes/permissions.test.ts
git add src/models/permission.ts src/routes/auth.tsx tests/models/permission.test.ts tests/routes/permissions.test.ts
git commit -m "refactor: make Permission a fully class-based API"
```

---

### Task 2: Denial table migration + denial data-access methods

**Files:**
- Create: `migrations/0013_create_user_permission_denials.sql`
- Modify: `src/models/permission.ts` (add sentinel constant, `UserPermissionDenial` type, `deny`/`restore`/`denialsForUser`)
- Test: `tests/models/permission.test.ts`

**Interfaces:**
- Produces:
  - `INDEFINITE_DENIAL_EXPIRES_AT = "9999-12-31T23:59:59.999Z"` (exported const)
  - `interface UserPermissionDenial { permissionId: number; expiresAt: string }`
  - `Permission.deny(db, userId, permissionId, expiresAt: string): Promise<void>` (upsert)
  - `Permission.restore(db, userId, permissionId): Promise<void>`
  - `Permission.denialsForUser(db, userId): Promise<readonly UserPermissionDenial[]>`

- [ ] **Step 1: Write the migration.**

Create `migrations/0013_create_user_permission_denials.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_permission_denials (
  user_id       INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS user_permission_denials_user_id_index
  ON user_permission_denials(user_id);
```

- [ ] **Step 2: Write failing tests for the denial methods (CRUD only — no `can` dependency).**

Append to `tests/models/permission.test.ts` (imports: `Permission` is already imported; add `USERS_READ_PERMISSION` if not present, and `INDEFINITE_DENIAL_EXPIRES_AT`):

```ts
test("deny records a denial (upserting) and restore removes it", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "u@example.com",
    username: "u",
  });
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  await Permission.deny(db, userId, permission.id, INDEFINITE_DENIAL_EXPIRES_AT);
  assert.deepEqual(
    (await Permission.denialsForUser(db, userId)).map((d) => ({
      expiresAt: d.expiresAt,
      permissionId: d.permissionId,
    })),
    [{ expiresAt: INDEFINITE_DENIAL_EXPIRES_AT, permissionId: permission.id }],
  );

  // Re-denying upserts: one row, expiry updated.
  const future = new Date(Date.now() + 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, future);
  assert.deepEqual(
    (await Permission.denialsForUser(db, userId)).map((d) => d.expiresAt),
    [future],
  );

  await Permission.restore(db, userId, permission.id);
  assert.deepEqual(await Permission.denialsForUser(db, userId), []);
});
```

- [ ] **Step 3: Run tests to verify they fail.**

Run: `npm test 2>&1 | grep -E "deny records a denial|fail"`
Expected: FAIL — `Permission.deny is not a function`.

- [ ] **Step 4: Implement the sentinel, type, and methods.**

In `src/models/permission.ts`, add near the top (after imports):

```ts
// Indefinite denials store a far-future expiry rather than NULL, so the
// permission query never needs an IS NULL branch. Sorts after any real ISO date.
export const INDEFINITE_DENIAL_EXPIRES_AT = "9999-12-31T23:59:59.999Z";

export interface UserPermissionDenial {
  permissionId: number;
  expiresAt: string;
}
```

Add these static methods inside `Permission`:

```ts
static async deny(
  db: D1Database,
  userId: number,
  permissionId: number,
  expiresAt: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_permission_denials (user_id, permission_id, expires_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(user_id, permission_id)
       DO UPDATE SET expires_at = ?3`,
    )
    .bind(userId, permissionId, expiresAt)
    .run();
}

static async restore(
  db: D1Database,
  userId: number,
  permissionId: number,
): Promise<void> {
  await db
    .prepare(
      `DELETE FROM user_permission_denials
       WHERE user_id = ?1 AND permission_id = ?2`,
    )
    .bind(userId, permissionId)
    .run();
}

static async denialsForUser(
  db: D1Database,
  userId: number,
): Promise<readonly UserPermissionDenial[]> {
  const result = await db
    .prepare(
      `SELECT permission_id, expires_at
       FROM user_permission_denials
       WHERE user_id = ?1`,
    )
    .bind(userId)
    .all<{ permission_id: number; expires_at: string }>();

  return result.results.map((row) => ({
    permissionId: row.permission_id,
    expiresAt: row.expires_at,
  }));
}
```

(The `can` denial clause is added in Task 3; this task's CRUD test does not exercise `can`, so it goes fully green here.)

- [ ] **Step 5: Typecheck, run the CRUD test, then commit.**

Run: `npm run typecheck` → no errors. `npm test 2>&1 | grep -E "deny records a denial"` → PASS.

```bash
deno fmt src/models/permission.ts tests/models/permission.test.ts
git add migrations/0013_create_user_permission_denials.sql src/models/permission.ts tests/models/permission.test.ts
git commit -m "feat: add user_permission_denials table and denial data-access"
```

---

### Task 3: Fold denials into `Permission.can`

**Files:**
- Modify: `src/models/permission.ts` (`can` query)
- Test: `tests/models/permission.test.ts` (Task 2's suppression tests now go green)

**Interfaces:**
- Consumes: `user_permission_denials` (Task 2), `INDEFINITE_DENIAL_EXPIRES_AT`.
- Produces: `Permission.can` now returns `false` when an active denial exists for `(userId, permissionName)`. Signature unchanged.

- [ ] **Step 1: Write failing suppression tests.**

Append to `tests/models/permission.test.ts`:

```ts
test("deny suppresses a role-granted permission until cleared", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "s1@example.com",
    username: "s1",
  });
  await assignRoleToUser(db, userId, "admin"); // admin holds users:read
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);

  await Permission.deny(db, userId, permission.id, INDEFINITE_DENIAL_EXPIRES_AT);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), false);

  await Permission.restore(db, userId, permission.id);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);
});

test("an expired snooze does not suppress; a future one does", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "s2@example.com",
    username: "s2",
  });
  await assignRoleToUser(db, userId, "admin");
  const permission = (await Permission.all(db)).find(
    ({ name }) => name === USERS_READ_PERMISSION,
  );
  assert.ok(permission);

  const past = new Date(Date.now() - 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, past);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), true);

  const future = new Date(Date.now() + 60_000).toISOString();
  await Permission.deny(db, userId, permission.id, future);
  assert.equal(await Permission.can(USERS_READ_PERMISSION, db, userId), false);
});
```

- [ ] **Step 2: Run to verify they fail.**

Run: `npm test 2>&1 | grep -E "deny suppresses|expired snooze"`
Expected: FAIL — `can` does not yet consult denials, so the deny assertions return `true`.

- [ ] **Step 3: Add the denial clause and the `now` binding.**

Replace the body of `Permission.can` with:

```ts
static async can(
  name: string,
  db: D1Database,
  userId: number | null | undefined,
): Promise<boolean> {
  if (!userId || !name) return false;

  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT 1 AS allowed
       FROM user_roles
       JOIN role_permissions
         ON role_permissions.role_id = user_roles.role_id
       JOIN permissions
         ON permissions.id = role_permissions.permission_id
       WHERE user_roles.user_id = ?1
         AND permissions.name = ?2
         AND NOT EXISTS (
           SELECT 1 FROM user_permission_denials d
           WHERE d.user_id = ?1
             AND d.permission_id = permissions.id
             AND d.expires_at > ?3
         )
       LIMIT 1`,
    )
    .bind(userId, name, now)
    .first<{ allowed: number }>();

  return row?.allowed === 1;
}
```

- [ ] **Step 4: Run the suppression tests — now passing.**

Run: `npm test 2>&1 | grep -E "deny suppresses|expired snooze"`
Expected: both PASS.

- [ ] **Step 5: Run the full suite.**

Run: `npm test`
Expected: all pass (99 tests: 96 prior + 1 CRUD (Task 2) + 2 suppression).

- [ ] **Step 6: Format and commit.**

```bash
deno fmt src/models/permission.ts
git add src/models/permission.ts tests/models/permission.test.ts
git commit -m "feat: suppress denied permissions in Permission.can"
```

---

### Task 4: Seed `author` and `editor` roles

**Files:**
- Create: `migrations/0014_seed_author_editor_roles.sql`
- Test: `tests/models/permission.test.ts`

**Interfaces:**
- Produces: roles `author` (`posts:create`, `posts:read`) and `editor` (`posts:create`, `posts:read`, `posts:update`, `posts:delete`).

- [ ] **Step 1: Write the migration.**

Create `migrations/0014_seed_author_editor_roles.sql`:

```sql
INSERT OR IGNORE INTO roles (name) VALUES ('author'), ('editor');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'author'
  AND permissions.name IN ('posts:create', 'posts:read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'editor'
  AND permissions.name IN
    ('posts:create', 'posts:read', 'posts:update', 'posts:delete');
```

- [ ] **Step 2: Write a failing test for the seeded grants.**

Append to `tests/models/permission.test.ts` (add `getRoleByName` to the role.js import):

```ts
test("author and editor roles are seeded with their post permissions", async () => {
  const db = createTestDb();
  const author = await getRoleByName(db, "author");
  const editor = await getRoleByName(db, "editor");
  assert.ok(author);
  assert.ok(editor);

  assert.deepEqual(
    (await Permission.forRole(db, author.id)).map(({ name }) => name),
    ["posts:create", "posts:read"],
  );
  assert.deepEqual(
    (await Permission.forRole(db, editor.id)).map(({ name }) => name),
    ["posts:create", "posts:delete", "posts:read", "posts:update"],
  );
});
```

(`Permission.forRole` orders by name ASC, hence `posts:delete` before `posts:read`.)

- [ ] **Step 3: Run it to verify fail, then pass.**

Run: `npm test 2>&1 | grep -E "author and editor"`
Expected: PASS (migrations apply automatically in `createTestDb`). If it fails on ordering, adjust the expected array to the ASC order.

- [ ] **Step 4: Commit.**

```bash
git add migrations/0014_seed_author_editor_roles.sql tests/models/permission.test.ts
git commit -m "feat: seed author and editor roles"
```

---

### Task 5: Move role assignment to its own route

Split role saving out of `POST /admin/users/:id` into `POST /admin/users/:id/roles` (the new page will post here). The self-lock rule (a user cannot drop their own `admin`) moves with it.

**Files:**
- Modify: `src/routes/auth.tsx` (`POST /admin/users/:id` — remove role handling; add `POST /admin/users/:id/roles`)
- Test: `tests/routes/permissions.test.ts`

**Interfaces:**
- Consumes: `setRolesForUser`, `getRoleByName`, `ADMIN_ROLE`, `formRoleIds`, `Permission.require`.
- Produces: `POST /admin/users/:id/roles` (guarded `users:update`) saving role assignment; `POST /admin/users/:id` no longer reads `roleIds`.

- [ ] **Step 1: Write failing tests.**

Append to `tests/routes/permissions.test.ts` (imports: add `getRolesForUser` from role.js):

```ts
test("role save moves to /roles and enforces users:update", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a2@example.com",
    username: "a2",
  });
  const target = await seedUser(db, {
    email: "t2@example.com",
    username: "t2",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const token = await createSession(db, admin);
  const form = {
    Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const editorRole = await getRoleByName(db, "editor");
  assert.ok(editorRole);

  const res = await app.request(
    `/admin/users/${target}/roles`,
    {
      body: new URLSearchParams({ roleIds: String(editorRole.id) }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(res.status, 303);
  assert.deepEqual(await getRolesForUser(db, target), ["editor"]);
});
```

Add `getRoleByName` to the role.js import in this test file.

- [ ] **Step 2: Run to verify fail.**

Run: `npm test 2>&1 | grep -E "role save moves"`
Expected: FAIL (404/no route).

- [ ] **Step 3: Remove role handling from `POST /admin/users/:id`.**

In `src/routes/auth.tsx`, in the `POST /admin/users/:id` handler, delete the role block:

```ts
// DELETE these lines:
const roleIds = formRoleIds(body);
...
if (id === c.var.currentUser.id) {
  const adminRole = await getRoleByName(c.env.DB, ADMIN_ROLE);
  if (adminRole) roleIds.push(adminRole.id);
}
...
await setRolesForUser(c.env.DB, id, roleIds);
```

Leave the identity/active/password logic intact.

- [ ] **Step 4: Add the `/roles` route.**

Add after `POST /admin/users/:id`:

```ts
authRoute.post(
  "/admin/users/:id/roles",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    if (!Number.isInteger(id)) {
      return c.redirect("/admin/users", 303);
    }

    const body = await c.req.parseBody({ all: true });
    const roleIds = formRoleIds(body);

    // A user cannot strip their own admin role.
    if (id === c.var.currentUser.id) {
      const adminRole = await getRoleByName(c.env.DB, ADMIN_ROLE);
      if (adminRole) roleIds.push(adminRole.id);
    }

    await setRolesForUser(c.env.DB, id, roleIds);
    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);
```

- [ ] **Step 5: Typecheck, test, format, commit.**

Run: `npm run typecheck` → clean. `npm test 2>&1 | grep -E "role save moves"` → PASS.

```bash
deno fmt src/routes/auth.tsx tests/routes/permissions.test.ts
git add src/routes/auth.tsx tests/routes/permissions.test.ts
git commit -m "feat: move user role assignment to /admin/users/:id/roles"
```

---

### Task 6: Denial routes (deny/snooze + clear)

**Files:**
- Modify: `src/routes/auth.tsx` (`denialExpiresAt` helper; two routes)
- Test: `tests/routes/permissions.test.ts`

**Interfaces:**
- Consumes: `Permission.deny`, `Permission.restore`, `Permission.byId`, `INDEFINITE_DENIAL_EXPIRES_AT`, `Permission.require`.
- Produces:
  - `POST /admin/users/:id/denials` — body `permissionId`, `duration` (`"1h"|"1d"|"1w"|"indefinite"`); guarded `users:update`.
  - `POST /admin/users/:id/denials/:permissionId/delete` — clear; guarded `users:update`.
  - `denialExpiresAt(duration: string): string | null` — maps a duration key to an ISO expiry (sentinel for `"indefinite"`), `null` if invalid.

- [ ] **Step 1: Write failing tests.**

Append to `tests/routes/permissions.test.ts` (add `COMMENTS_CREATE_PERMISSION` to the permission.js import):

```ts
test("denying comments:create blocks commenting; clearing restores it", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a3@example.com",
    username: "a3",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const token = await createSession(db, admin);
  const form = {
    Cookie: `${SESSION_COOKIE_NAME}=${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  const perm = (await Permission.all(db)).find(
    ({ name }) => name === COMMENTS_CREATE_PERMISSION,
  );
  assert.ok(perm);

  // admin holds comments:create by default
  assert.equal(await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin), true);

  const deny = await app.request(
    `/admin/users/${admin}/denials`,
    {
      body: new URLSearchParams({
        duration: "indefinite",
        permissionId: String(perm.id),
      }).toString(),
      headers: form,
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(deny.status, 303);
  assert.equal(await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin), false);

  const clear = await app.request(
    `/admin/users/${admin}/denials/${perm.id}/delete`,
    { headers: form, method: "POST" },
    { DB: db } as Env,
  );
  assert.equal(clear.status, 303);
  assert.equal(await Permission.can(COMMENTS_CREATE_PERMISSION, db, admin), true);
});

test("denial routes require users:update", async () => {
  const db = createTestDb();
  const nobody = await seedUser(db, {
    email: "n@example.com",
    username: "nobody",
  });
  const token = await createSession(db, nobody);
  const res = await app.request(
    `/admin/users/${nobody}/denials`,
    {
      body: new URLSearchParams({ duration: "1h", permissionId: "1" })
        .toString(),
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(res.status, 403);
});
```

- [ ] **Step 2: Run to verify fail.**

Run: `npm test 2>&1 | grep -E "blocks commenting|denial routes require"`
Expected: FAIL (no routes).

- [ ] **Step 3: Add the helper and routes.**

In `src/routes/auth.tsx`, add near the other module helpers:

```ts
const SNOOZE_DURATIONS_MS: Record<string, number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

// Maps a duration form value to an ISO expiry: a preset window from now, or the
// far-future sentinel for an indefinite deny. Returns null for anything else.
const denialExpiresAt = (duration: string): string | null => {
  if (duration === "indefinite") return INDEFINITE_DENIAL_EXPIRES_AT;
  const ms = SNOOZE_DURATIONS_MS[duration];
  return ms ? new Date(Date.now() + ms).toISOString() : null;
};
```

Add `INDEFINITE_DENIAL_EXPIRES_AT` to the permission.js import. Add the routes after the `/roles` route:

```ts
authRoute.post(
  "/admin/users/:id/denials",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const body = await c.req.parseBody();
    const permissionId = Number.parseInt(formString(body, "permissionId"), 10);
    const expiresAt = denialExpiresAt(formString(body, "duration"));

    if (Number.isInteger(id) && Number.isInteger(permissionId) && expiresAt) {
      const permission = await Permission.byId(c.env.DB, permissionId);
      if (permission) {
        await Permission.deny(c.env.DB, id, permission.id, expiresAt);
      }
    }

    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);

authRoute.post(
  "/admin/users/:id/denials/:permissionId/delete",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const permissionId = Number.parseInt(c.req.param("permissionId"), 10);

    if (Number.isInteger(id) && Number.isInteger(permissionId)) {
      await Permission.restore(c.env.DB, id, permissionId);
    }

    return c.redirect(`/admin/users/${id}/permissions`, 303);
  },
);
```

- [ ] **Step 4: Typecheck, test.**

Run: `npm run typecheck` → clean. `npm test 2>&1 | grep -E "blocks commenting|denial routes require"` → PASS.

- [ ] **Step 5: Format and commit.**

```bash
deno fmt src/routes/auth.tsx tests/routes/permissions.test.ts
git add src/routes/auth.tsx tests/routes/permissions.test.ts
git commit -m "feat: add per-user permission denial routes"
```

---

### Task 7: Icon components + Users-table changes

Swap the Add-user icon to circle-plus, replace the inline role checkboxes with read-only badges, and add a per-row "Manage access" button linking to the new page.

**Files:**
- Create: `src/views/components/icons/CirclePlusIcon.tsx`, `src/views/components/icons/UserPenIcon.tsx`
- Modify: `src/views/AdminUsers.tsx`
- Test: `tests/views/admin-users.test.ts`

**Interfaces:**
- Consumes: existing `Badge`, `Button` components; `user.roles` (already on `User`).
- Produces: `CirclePlusIcon`, `UserPenIcon` FCs (no props); a Users table with role badges, a circle-plus Add button, and a `/admin/users/:id/permissions` link per row. The `RolePicker` component and the `roles` prop are removed from `AdminUsers`.

- [ ] **Step 1: Create the icon components.**

`src/views/components/icons/CirclePlusIcon.tsx`:

```tsx
import type { FC } from "hono/jsx";

export const CirclePlusIcon: FC = () => (
  <svg
    aria-hidden="true"
    class="size-4 fill-none stroke-current"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12h8" />
    <path d="M12 8v8" />
  </svg>
);
```

`src/views/components/icons/UserPenIcon.tsx` — the SVG currently inlined in the Add-user button (`AdminUsers.tsx`):

```tsx
import type { FC } from "hono/jsx";

export const UserPenIcon: FC = () => (
  <svg
    aria-hidden="true"
    class="size-4 fill-none stroke-current"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <circle cx="10" cy="7" r="4" />
    <path d="M11.5 15H7a4 4 0 0 0-4 4v2" />
    <path d="M21.4 16.6a1 1 0 0 0-3-3l-4 4a2 2 0 0 0-.5.9l-.9 2.9a.5.5 0 0 0 .6.6l2.9-.9a2 2 0 0 0 .9-.5Z" />
  </svg>
);
```

- [ ] **Step 2: Write a failing view test.**

Add to `tests/views/admin-users.test.ts` (follow the file's existing render-and-assert pattern):

```ts
test("users table shows role badges and a manage-access link, not checkboxes", () => {
  const html = renderToString(
    <AdminUsers
      currentUserId={1}
      users={[{
        id: 2,
        email: "e@example.com",
        username: "member",
        label: "Member",
        active: true,
        roles: ["editor"],
        passwordHash: "",
        createdAt: "",
        updatedAt: "",
      }] as unknown as User[]}
    />,
  );
  assert.ok(html.includes("/admin/users/2/permissions"));
  assert.ok(html.includes(">editor<")); // role badge text
  assert.ok(!html.includes('name="roleIds"')); // no inline checkboxes
});
```

Match the import style already used in `tests/views/admin-users.test.ts` (it will show how `AdminUsers`, `renderToString`, and `User` are imported and how props are built — mirror it; drop the now-removed `roles` prop).

- [ ] **Step 3: Run to verify fail.**

Run: `npm test 2>&1 | grep -E "role badges and a manage-access"`
Expected: FAIL.

- [ ] **Step 4: Update `AdminUsers.tsx`.**

1. Remove the `RolePicker` component and its usages; remove `roles` from `AdminUsersProps` and the destructure; remove the now-unused `Role`/`ADMIN_ROLE` and `RolePicker`-only imports.
2. Import the icons: `import { CirclePlusIcon } from "./components/icons/CirclePlusIcon.js";` and `import { UserPenIcon } from "./components/icons/UserPenIcon.js";`.
3. Add-user button: replace the inline `<svg>…</svg>` with `<CirclePlusIcon />`.
4. New-user row: remove the `<RolePicker form="new-user-form" roles={roles} />` cell content (leave an empty `<td class="py-3 pr-4" />` so the column count is unchanged).
5. Per-user Roles cell: replace `<RolePicker … />` with read-only badges:

```tsx
<td class="py-3 pr-4">
  <div class="flex flex-wrap gap-1">
    {user.roles.length === 0
      ? <span class={panelMuted}>No roles</span>
      : user.roles.map((role) => <Badge variant="default">{role}</Badge>)}
  </div>
</td>
```

6. Per-user Actions cell: add, before the Save button, a link styled as the outline button to the access page:

```tsx
<a
  aria-label={`Manage access for ${user.username}`}
  class={panelOutlineButton}
  href={`/admin/users/${user.id}/permissions`}
  title={`Manage access for ${user.username}`}
>
  <UserPenIcon />
</a>
```

(If `Badge` has no `default` variant, use the neutral variant already used elsewhere — check `components/ui/Badge.tsx`.)

- [ ] **Step 5: Typecheck, test, format, commit.**

Run: `npm run typecheck` → clean. `npm test 2>&1 | grep -E "role badges"` → PASS. Then full `npm test` (fix any other admin-users test that passed a `roles` prop or asserted checkboxes).

```bash
deno fmt src/views/AdminUsers.tsx src/views/components/icons/CirclePlusIcon.tsx src/views/components/icons/UserPenIcon.tsx tests/views/admin-users.test.ts
git add src/views/AdminUsers.tsx src/views/components/icons tests/views/admin-users.test.ts
git commit -m "feat: circle-plus add button, role badges, manage-access link"
```

---

### Task 8: `AdminUserAccess` page component

The view rendered by the new page: role checkboxes (moved here) + a per-permission denial panel.

**Files:**
- Create: `src/views/AdminUserAccess.tsx`
- Test: `tests/views/admin-user-access.test.ts`

**Interfaces:**
- Consumes: `User`, `Role`, `PermissionRecord`, `UserPermissionDenial`, `Layout`, `HeaderSlim`, `AdminNav`, `Button`, `Badge`, panel styles.
- Produces:
```ts
type AdminUserAccessProps = {
  denials: readonly UserPermissionDenial[];
  permissions: readonly PermissionRecord[]; // permissions the user gets via roles
  roles: readonly Role[];                   // all roles (for the picker)
  user: User;
  viewerUsername?: string;
};
export const AdminUserAccess: FC<AdminUserAccessProps>;
```

- [ ] **Step 1: Write a failing view test.**

`tests/views/admin-user-access.test.ts` (mirror imports/`renderToString` usage from `tests/views/admin-users.test.ts`):

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "hono/jsx/dom/server";
import { AdminUserAccess } from "../../src/views/AdminUserAccess.js";
import type { User } from "../../src/models/user.js";
import type { Role } from "../../src/models/role.js";

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
    <AdminUserAccess
      denials={[{ permissionId: 10, expiresAt: "9999-12-31T23:59:59.999Z" }]}
      permissions={[
        { id: 10, name: "comments:create", createdAt: "", updatedAt: "" },
        { id: 11, name: "comments:read", createdAt: "", updatedAt: "" },
      ]}
      roles={[{ id: 1, name: "editor", createdAt: "", updatedAt: "" }] as Role[]}
      user={user}
    />,
  );
  assert.ok(html.includes("/admin/users/2/roles"));
  assert.ok(html.includes("/admin/users/2/denials"));
  assert.ok(html.includes("/admin/users/2/denials/10/delete")); // clear denied perm
  assert.ok(html.includes("comments:create"));
});
```

- [ ] **Step 2: Run to verify fail.**

Run: `npm test 2>&1 | grep -E "access page posts roles"`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `AdminUserAccess.tsx`.**

Use `AdminUsers.tsx` and `AdminRoles.tsx` as structural references (Layout + HeaderSlim + AdminNav grid). Core body:

```tsx
import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
import type { Role } from "../models/role.js";
import type { UserPermissionDenial } from "../models/permission.js";
import type { PermissionRecord } from "../models/permission.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { panelMuted, panelOutlineButton, panelText } from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

const DURATIONS = [
  { label: "1 hour", value: "1h" },
  { label: "1 day", value: "1d" },
  { label: "1 week", value: "1w" },
  { label: "Indefinite", value: "indefinite" },
];

type AdminUserAccessProps = {
  denials: readonly UserPermissionDenial[];
  permissions: readonly PermissionRecord[];
  roles: readonly Role[];
  user: User;
  viewerUsername?: string;
};

export const AdminUserAccess: FC<AdminUserAccessProps> = ({
  denials,
  permissions,
  roles,
  user,
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    title: `Access · ${user.username} | Shipping Binaries`,
    robots: "noindex",
  };
  const denialByPermission = new Map(
    denials.map((d) => [d.permissionId, d.expiresAt]),
  );

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/users" />
        <div class="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-2xl">Roles · {user.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={`/admin/users/${user.id}/roles`} method="post">
                <div class="flex flex-wrap gap-x-3 gap-y-2">
                  {roles.map((role) => (
                    <label class="inline-flex items-center gap-1.5">
                      <input
                        checked={user.roles.includes(role.name)}
                        class="size-4 accent-chocolate-500"
                        name="roleIds"
                        type="checkbox"
                        value={role.id}
                      />
                      <span class={panelText}>{role.name}</span>
                    </label>
                  ))}
                </div>
                <div class="mt-4">
                  <Button size="sm" type="submit" variant="primary">
                    Save roles
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-2xl">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul class="space-y-3">
                {permissions.map((permission) => {
                  const expiresAt = denialByPermission.get(permission.id);
                  return (
                    <li class="flex flex-wrap items-center justify-between gap-2">
                      <span class="flex items-center gap-2">
                        <code>{permission.name}</code>
                        {expiresAt
                          ? (
                            <Badge variant="draft">
                              {expiresAt >= "9999"
                                ? "Denied"
                                : `Snoozed until ${expiresAt}`}
                            </Badge>
                          )
                          : <Badge variant="published">Active</Badge>}
                      </span>
                      <span class="flex items-center gap-2">
                        <form
                          action={`/admin/users/${user.id}/denials`}
                          class="flex items-center gap-2"
                          method="post"
                        >
                          <input
                            name="permissionId"
                            type="hidden"
                            value={permission.id}
                          />
                          <select class={panelText} name="duration">
                            {DURATIONS.map((d) => (
                              <option value={d.value}>{d.label}</option>
                            ))}
                          </select>
                          <Button size="sm" type="submit" variant="outline">
                            Deny
                          </Button>
                        </form>
                        {expiresAt && (
                          <form
                            action={`/admin/users/${user.id}/denials/${permission.id}/delete`}
                            method="post"
                          >
                            <Button size="sm" type="submit" variant="outline">
                              Clear
                            </Button>
                          </form>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {permissions.length === 0 && (
                <p class={panelMuted}>This user's roles grant no permissions.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
};
```

(Verify `Badge` variant names against `components/ui/Badge.tsx`; adjust `variant` values if `draft`/`published`/`default` differ. The `expiresAt >= "9999"` check distinguishes the indefinite sentinel from a real snooze date.)

- [ ] **Step 4: Run to verify pass.**

Run: `npm run typecheck` → clean. `npm test 2>&1 | grep -E "access page posts roles"` → PASS.

- [ ] **Step 5: Format and commit.**

```bash
deno fmt src/views/AdminUserAccess.tsx tests/views/admin-user-access.test.ts
git add src/views/AdminUserAccess.tsx tests/views/admin-user-access.test.ts
git commit -m "feat: add AdminUserAccess page component"
```

---

### Task 9: `GET /admin/users/:id/permissions` route

Wire the page: load the user, their role-derived permissions, and their denials.

**Files:**
- Modify: `src/routes/auth.tsx` (new GET route + import `AdminUserAccess`)
- Test: `tests/routes/permissions.test.ts`

**Interfaces:**
- Consumes: `getUserById`, `getAllRoles`, `Permission.forUser`, `Permission.denialsForUser`, `AdminUserAccess`, `Permission.require`.
- Produces: `GET /admin/users/:id/permissions` (guarded `users:update`) rendering `AdminUserAccess`.

- [ ] **Step 1: Write a failing test.**

Append to `tests/routes/permissions.test.ts`:

```ts
test("GET /admin/users/:id/permissions renders for users:update, 403 otherwise", async () => {
  const db = createTestDb();
  const admin = await seedUser(db, {
    email: "a4@example.com",
    username: "a4",
  });
  const target = await seedUser(db, {
    email: "t4@example.com",
    username: "t4",
  });
  await assignRoleToUser(db, admin, ADMIN_ROLE);
  const adminToken = await createSession(db, admin);
  const ok = await app.request(
    `/admin/users/${target}/permissions`,
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${adminToken}` } },
    { DB: db } as Env,
  );
  assert.equal(ok.status, 200);
  assert.ok((await ok.text()).includes(`/admin/users/${target}/roles`));

  const nobodyToken = await createSession(db, target);
  const denied = await app.request(
    `/admin/users/${target}/permissions`,
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${nobodyToken}` } },
    { DB: db } as Env,
  );
  assert.equal(denied.status, 403);
});
```

- [ ] **Step 2: Run to verify fail.**

Run: `npm test 2>&1 | grep -E "renders for users:update"`
Expected: FAIL (404 for the 200 case).

- [ ] **Step 3: Add the route.**

Import `AdminUserAccess` in `src/routes/auth.tsx`:

```ts
import { AdminUserAccess } from "../views/AdminUserAccess.js";
```

Add the route (place it before `POST /admin/users/:id/roles` for readability):

```ts
authRoute.get(
  "/admin/users/:id/permissions",
  Permission.require(USERS_UPDATE_PERMISSION),
  async (c) => {
    c.header("Cache-Control", "no-store");
    const id = Number.parseInt(c.req.param("id"), 10);
    const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;
    if (!user) {
      return c.notFound();
    }

    const [roles, permissions, denials] = await Promise.all([
      getAllRoles(c.env.DB),
      Permission.forUser(c.env.DB, user.id),
      Permission.denialsForUser(c.env.DB, user.id),
    ]);

    return c.html(
      <AdminUserAccess
        denials={denials}
        permissions={permissions}
        roles={roles}
        user={user}
        viewerUsername={c.var.currentUser.username}
      />,
    );
  },
);
```

- [ ] **Step 4: Typecheck, test.**

Run: `npm run typecheck` → clean. `npm test 2>&1 | grep -E "renders for users:update"` → PASS.

- [ ] **Step 5: Full suite, format, commit.**

Run: `npm test` → all pass. `npm run build` → clean; then `git checkout public/styles.css` (generated).

```bash
deno fmt src/routes/auth.tsx tests/routes/permissions.test.ts
git add src/routes/auth.tsx tests/routes/permissions.test.ts
git commit -m "feat: add access-management page route"
```

---

### Task 10: Manual verification + migration application

**Files:** none (verification only).

- [ ] **Step 1: Apply migrations locally.**

Run: `npm run db:migrate:local`
Expected: `0013` and `0014` apply cleanly.

- [ ] **Step 2: Full gates.**

Run: `npm run typecheck && npm test && npm run build && git diff --check`
Expected: typecheck clean; all tests pass; build succeeds; no whitespace errors. Restore generated CSS: `git checkout public/styles.css`.

- [ ] **Step 3: Exercise in the browser (`npm run dev:worker`).**

Verify: Users table shows the circle-plus Add button, role badges, and a Manage-access button per row → opens `/admin/users/:id/permissions`; saving roles works; Deny with each preset shows "Snoozed until…", Indefinite shows "Denied", Clear removes it; a snoozed `comments:create` blocks commenting for that user until it lapses.

---

## Self-Review

**Spec coverage:** author/editor roles (Task 4) · deny-only denial table (Task 2) · read-time expiry via `NOT EXISTS` + ISO `now` (Task 3) · indefinite sentinel (Task 2, used Tasks 6/8) · snooze presets (Task 6) · fully class-based Permission (Task 1, new methods Tasks 2–3) · icon swap + roles-to-badges + manage-access link (Task 7) · consolidated roles+denials page (Tasks 8–9) · route split for role save (Task 5) · all new routes gated `users:update` (Tasks 5,6,9). No uncovered spec section.

**Placeholder scan:** every code step shows complete code; commands have expected output. Two soft references — "match the file's existing test import pattern" (Tasks 7,8) and "verify Badge variant names" (Tasks 7,8) — are deliberate: the exact `renderToString` import path and `Badge` variant strings must be read from the repo, not invented. No `TODO`/`TBD`.

**Type consistency:** `Permission.deny/restore/denialsForUser`, `UserPermissionDenial {permissionId, expiresAt}`, `INDEFINITE_DENIAL_EXPIRES_AT`, `denialExpiresAt`, and the route paths (`/roles`, `/denials`, `/denials/:permissionId/delete`, `/permissions`) are used identically across the tasks that define and consume them.
