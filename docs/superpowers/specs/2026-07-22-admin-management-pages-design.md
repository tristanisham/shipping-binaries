# Admin management pages — design

Date: 2026-07-22

## Summary

Restructure the admin area. The post editor currently living on `/admin`
(`Dashboard.tsx`) moves to a dedicated `/admin/write` view. `/admin` becomes a
landing page that keeps the existing 20/60/20 three-column layout, with the left
column now listing the admin management pages. Two management pages are added:

- `/admin/users` — list all users, quick-deactivate, edit user details.
- `/admin/posts` — list all posts, quick-toggle draft, edit (which reuses the
  editor at `/admin/write?id=<postID>`).

Post content is fully persisted: this adds a `body` column, post create/update,
and wires the editor's `Save draft` / `Publish` buttons.

All routes stay behind the existing `requireSession` middleware in
`src/routes/auth.tsx`. There is a single owner today, but the management pages
operate over **all** users and posts.

## Data layer

### Migration `migrations/0004_admin_management.sql`

```sql
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1
  CHECK (active IN (0, 1));

ALTER TABLE posts ADD COLUMN body TEXT NOT NULL DEFAULT '';
```

`body` is required because the editor has a Body field with nowhere to persist
today.

### `src/models/user.ts`

- Add `active: boolean` to `User`; `active: 0 | 1` to `UserRow`; map in
  `userFromRow`.
- New queries (all use prepared statements with `?1`-style bindings):
  - `getAllUsers(db): Promise<readonly User[]>` — ordered by `id ASC`.
  - `getUserById(db, id): Promise<User | null>`.
  - `updateUser(db, id, { email, username })` — bumps `updated_at`.
  - `setUserActive(db, id, active: boolean)` — bumps `updated_at`.
  - `setUserPassword(db, id, passwordHash)` — bumps `updated_at`.

### `src/models/post.ts`

- Add `body: string` to `Post` and `PostRow`; map both ways in `postFromRow` /
  `postToRow`. Add `body` to every `SELECT` column list.
- New queries:
  - `getAllPosts(db)` — all authors, ordered `created_at DESC, id DESC`,
    annotated with author `username` (join `users`). Returns a lightweight
    shape (`Post` + `authorUsername`); comments are not loaded for the list.
  - `createPost(db, { userId, title, description, keywords, image, body, draft })`
    → returns the new post `id`.
  - `updatePost(db, id, { title, description, keywords, image, body, draft })`
    — bumps `updated_at`.
  - `setPostDraft(db, id, draft: boolean)` — bumps `updated_at`.
- Keywords helper: comma-separated form input ⇄ JSON-array storage
  (`"Hono, Cloudflare"` ⇄ `["Hono","Cloudflare"]`), trimming blanks.

## Routes (`src/routes/auth.tsx`, under `requireSession`)

| Method / Path | Behavior |
|---|---|
| `GET /admin` | Render `AdminHome` (20/60/20 layout; left column = management nav). Replaces the current Dashboard render. |
| `GET /admin/write` | Render the editor. `?id=<n>` loads that post into the form; absent = blank new-post form. |
| `POST /admin/write` | Create (no `id`) or update (hidden `id`). Submit button carries `name="action"`: `draft` → `draft=1`, `publish` → `draft=0`. New post → redirect `/admin/write?id=<newId>` (303). Existing → redirect back to the same edit URL (303). |
| `GET /admin/users` | Left nav + full-width users table. |
| `POST /admin/users/:id/active` | Toggle `active`, redirect `/admin/users` (303). |
| `GET /admin/users/:id/edit` | Render `AdminUserEdit` form. 404 if user missing. |
| `POST /admin/users/:id` | Save email/username/active; if password field non-empty, hash and set it. Redirect `/admin/users` (303). |
| `GET /admin/posts` | Left nav + full-width posts table (all authors). |
| `POST /admin/posts/:id/draft` | Toggle `draft`, redirect `/admin/posts` (303). |

Post editing is not a new route: the posts table's **Edit** button links to
`GET /admin/write?id=<postID>`.

Notes:
- New post's `user_id` = `c.var.currentUser.id`.
- Password reset reuses `hashPassword` from `src/auth/password.ts`; an empty
  password field leaves the hash unchanged.
- Keep `Cache-Control: no-store` on all `/admin*` responses, consistent with
  existing handlers.
- Quick actions are server-rendered `<form method="post">` submits with a
  redirect back — no client JS.

## Views (`src/views/`)

- **`AdminHome.tsx`** — preserves the exact 20/60/20 grid classes. Left card is
  a list linking to Users / Posts / Write. Middle/right columns carry a light
  overview (recent posts + quick links) in the existing palette.
- **`Write.tsx`** — the current `Dashboard.tsx` editor markup, converted into a
  real `<form method="post" action="/admin/write">` with a hidden `id`,
  prefilled from an optional `post` prop. Two submit buttons: `Save draft`
  (`name="action" value="draft"`) and `Publish` (`value="publish"`). Keywords
  input shows the comma-joined list; Body textarea maps to the new `body`
  column.
- **`AdminUsers.tsx`** / **`AdminPosts.tsx`** — shared left-nav column plus a
  full-width table. Each row has quick-action forms and an Edit link/button.
- **`AdminUserEdit.tsx`** — user edit form (email, username, password reset,
  active).
- **`components/admin/AdminNav.tsx`** — extracted left-nav column shared by
  `/admin`, `/admin/users`, `/admin/posts`, with current-item highlighting
  (mirroring the `setCurrentNavItem` pattern used by the header nav).
- **Delete `Dashboard.tsx`**; update the `/admin` import in `auth.tsx`.

## Styling / conventions

- Hono JSX (`hono/jsx`), `.js` extensions on relative imports, two-space
  indent, strict TS.
- Preserve the site palette exactly (per CLAUDE.md). Reuse existing `ui/`
  primitives (`Card`, `Button`, `Input`, `Textarea`, `Badge`) and the
  `HeaderSlim` header.
- Never hand-edit `public/styles.css`.

## Testing / verification

No automated test suite exists. Before handoff:

```sh
npm run typecheck
npm run build
git diff --check
```

Apply the migration locally (`npm run db:migrate:local`) and exercise the
routes in the browser:

1. `/admin` shows the management nav.
2. `/admin/write` creates a post (Save draft and Publish), then reloads it via
   `?id=`.
3. `/admin/posts` lists all posts, toggles draft, and Edit opens the editor.
4. `/admin/users` lists users, deactivates/reactivates, and edits details
   including a password reset.

## Out of scope

- Comment management/moderation.
- Public rendering of post `body` (front-end blog display).
- User creation from the UI (still via `npm run account:create`).
- Deleting users or posts.
