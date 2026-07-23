# User access management — roles, per-user permission denials, and snooze

**Date:** 2026-07-23
**Status:** Design — awaiting review
**Builds on:** the RBAC enforcement work (`feature/rbac-enforcement`, PR #19), which
made `Permission.can`/`require` govern every `/admin` route per-handler.

## Summary

Add two seeded roles (`author`, `editor`) and a per-user **permission denial**
layer that lets an admin revoke a specific permission from an individual user —
permanently or on a self-expiring **snooze** — without changing the user's roles.
Consolidate role assignment and denial management onto one page,
`/admin/users/:id/permissions`. As part of this, make the `Permission` model a
single cohesive class API (all functions become static methods).

The motivating case: a user abusing comments can have `comments:create` /
`comments:update` snoozed for a set time (auto-lifting) or revoked indefinitely,
while keeping `comments:read`.

## Background — current state

- Permissions flow user → `user_roles` → `role_permissions` → `permissions`.
  `Permission.can(name, db, userId)` is a single JOIN returning whether any of
  the user's roles grants `name`.
- `admin` is seeded with every permission (migration 0012); `guest` has none.
- Roles are edited inline in the Users table via checkboxes (`AdminUsers.tsx`
  `RolePicker`), saved through `POST /admin/users/:id`.
- Expiry precedent: `auth_tokens` stores `expires_at` as
  `new Date(Date.now() + ttlMs).toISOString()` and compares it against a
  JS-generated ISO `now` bound as a parameter (`authToken.ts`) — deliberately
  **not** `CURRENT_TIMESTAMP`, so both sides share `toISOString()` format and
  string comparison is chronological. This feature follows that precedent.

## Decisions

1. **Deny-only overrides.** A user override can only *remove* a permission the
   user's roles grant, never add one. Resolution:
   `can = roleGrants(user, perm) AND NOT activeDenial(user, perm)`.
2. **Read-time expiry, no scheduler.** A denial carries an `expires_at`; it stops
   applying the instant it lapses, evaluated in the permission query. No cron.
3. **Indefinite = far-future sentinel, not NULL.** `expires_at` is always set.
   Indefinite deny → `INDEFINITE_DENIAL_EXPIRES_AT = "9999-12-31T23:59:59.999Z"`
   (sorts after any real ISO date). Snooze → nearer future ISO date. "Clear" →
   delete the row. This removes the `IS NULL` branch from the query.
4. **`editor` gets `posts:delete`.** `author` = `posts:create`, `posts:read`;
   `editor` = `author` + `posts:update` + `posts:delete`.
5. **Fully class-based `Permission`.** Every function in `models/permission.ts`
   becomes a static method on `Permission`; the module exports the class + the
   permission-name constants, no loose functions.
6. **Consolidated access page.** Role assignment moves off the Users table onto
   `/admin/users/:id/permissions`, alongside denial management.

## Data model

### Migration `0013_create_user_permission_denials.sql`

```sql
CREATE TABLE IF NOT EXISTS user_permission_denials (
  user_id       INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  expires_at    TEXT NOT NULL,            -- ISO 8601; sentinel = indefinite
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX IF NOT EXISTS user_permission_denials_user_id_index
  ON user_permission_denials(user_id);
```

Mirrors the `role_permissions` table style (STRICT, composite PK, FK CASCADE).
One denial per (user, permission); re-denying updates `expires_at` via upsert.

### Migration `0014_seed_author_editor_roles.sql`

```sql
INSERT OR IGNORE INTO roles (name) VALUES ('author'), ('editor');

-- author: create + read own
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'author'
  AND permissions.name IN ('posts:create', 'posts:read');

-- editor: author + update + delete (any post)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT roles.id, permissions.id
FROM roles CROSS JOIN permissions
WHERE roles.name = 'editor'
  AND permissions.name IN
    ('posts:create', 'posts:read', 'posts:update', 'posts:delete');
```

`author`/`editor` are **not** protected (`PROTECTED_ROLES` stays `admin`,
`guest`), so they remain renamable/deletable in the roles UI.

## Permission module — fully class-based API

`models/permission.ts` exports the name constants and one `Permission` class.
Method map (old free function → new static method):

| Old function | New method |
| --- | --- |
| `getAllPermissions` | `Permission.all` |
| `createPermission` | `Permission.create` |
| `getPermissionById` | `Permission.byId` |
| `getPermissionsForRole` | `Permission.forRole` |
| `getPermissionsForUser` | `Permission.forUser` |
| `assignPermissionToRole` | `Permission.assignToRole` |
| `setPermissionForRole` | `Permission.setForRole` |
| (existing) | `Permission.can` / `.cannot` / `.require` / `.requireAny` |
| **new** | `Permission.deny` / `.restore` / `.denialsForUser` |

Call sites to migrate: `routes/auth.tsx`, `routes/blog.tsx`, and the tests
(`tests/models/permission.test.ts`, `tests/routes/permissions.test.ts`). This is
a mechanical rename; behavior is unchanged for the moved functions.

New methods:

```ts
// Deny a permission for a user until `expiresAt` (ISO). Upsert on (user, perm).
static async deny(
  db: D1Database, userId: number, permissionId: number, expiresAt: string,
): Promise<void>

// Remove a denial (the "clear"/"pop off" action).
static async restore(
  db: D1Database, userId: number, permissionId: number,
): Promise<void>

// All active + expired denials for a user, for rendering the page.
static async denialsForUser(
  db: D1Database, userId: number,
): Promise<readonly UserPermissionDenial[]>
```

## Resolution logic

`Permission.can` gains a `NOT EXISTS` clause, still one round-trip, comparing
against a JS-bound ISO `now` (the `auth_tokens` pattern):

```sql
-- existing user_roles → role_permissions → permissions JOIN for ?1/?2, plus:
AND NOT EXISTS (
  SELECT 1 FROM user_permission_denials d
  WHERE d.user_id = ?1
    AND d.permission_id = permissions.id
    AND d.expires_at > ?3            -- ?3 = new Date().toISOString()
)
```

Because comment posting already gates on `Permission.can(COMMENTS_CREATE, …)` in
`blog.tsx`, denying `comments:create` blocks a user immediately with no route
change — the abuse case falls out for free.

## Admin UI

### Users table (`AdminUsers.tsx`)
- **Add-user button:** replace the user-pen SVG with the **circle-plus** icon.
- **Roles column:** replace the inline `RolePicker` checkboxes with read-only
  role badges (display only). Role editing moves to the new page.
- **New per-row action button** using the extracted **user-pen** icon, linking to
  `/admin/users/:id/permissions` (label/title "Manage access").
- Extract both icons into `components/icons/` (`CirclePlusIcon`, `UserPenIcon`).
- The inline identity form (label/username/email + Save) and the invite/active
  actions are unchanged.

### New page `/admin/users/:id/permissions` (`AdminUserAccess.tsx`)
One page, two sections for the selected user:
1. **Roles** — the `RolePicker` checkboxes (moved here), saved via
   `POST /admin/users/:id/roles`. The self-lock rule (a user cannot remove their
   own `admin` role) moves here.
2. **Permissions** — list every permission the user gets from their roles, each
   showing its state (Active / Snoozed until `T` / Denied) and controls:
   **Snooze** (presets: 1 hour, 1 day, 1 week), **Deny indefinitely**, **Clear**.
   Snooze/Deny → `POST /admin/users/:id/denials`; Clear →
   `POST /admin/users/:id/denials/:permissionId/delete`.

## Routes (all gated `users:update` via `Permission.require`)

| Method + path | Purpose |
| --- | --- |
| `GET  /admin/users/:id/permissions` | render the access page |
| `POST /admin/users/:id/roles` | save role assignment (moved off `POST /admin/users/:id`) |
| `POST /admin/users/:id/denials` | deny or snooze (`permissionId`, `duration`) |
| `POST /admin/users/:id/denials/:permissionId/delete` | clear a denial |

`POST /admin/users/:id` keeps identity/active/password handling and stops
handling `roleIds`. Duration input maps: preset key → `ttlMs`; "indefinite" →
the sentinel; both stored as an ISO `expires_at`.

## Authorization

All new routes require `users:update` (consistent with existing user
management). Managing a user's roles/denials is a user-mutation. No new
permission is introduced for this surface.

## Testing

- **Model:** `deny` then `can` is false; an expired snooze does not suppress;
  `restore` re-enables; indefinite sentinel suppresses; the class-API rename
  keeps existing behavior (existing model tests pass under new method names).
- **Routes:** denying `comments:create` makes `POST /blog/:slug/comments` return
  403; a future snooze blocks and a past one allows; role save + self-admin-lock
  work on the new page; all `/admin/users/:id/{permissions,roles,denials}` routes
  return 403 without `users:update`.
- **Seed:** `author` can create + edit own but not others'; `editor` can edit and
  delete any post.

## Migrations summary

- `0013_create_user_permission_denials.sql` — the denial table + index.
- `0014_seed_author_editor_roles.sql` — seed `author`/`editor` and their grants.

Applied with the project's `db:migrate:local` / `db:migrate:remote` scripts.

## Out of scope (YAGNI)

- Per-user **grants** (deny-only, per decision 1).
- Cron cleanup of expired denial rows — read-time evaluation is already correct;
  lazy cleanup can be added later if the table ever grows.
- Arbitrary date-picker for snooze — presets only for now.
- Denial audit log / history.
