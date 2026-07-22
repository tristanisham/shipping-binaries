# Admin Management Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the post editor to `/admin/write`, turn `/admin` into a
management landing page with a left nav column, and add `/admin/users` and
`/admin/posts` management pages with quick actions and edit forms — backed by
real post persistence and a test-driven model layer.

**Architecture:** Server-rendered Hono JSX pages behind the existing
`requireSession` middleware. Data access lives in `src/models/*` (D1 prepared
statements) and is unit-tested with Node's built-in test runner against an
in-memory `node:sqlite` adapter that mimics the D1 API and applies the real
migration files. Quick actions are plain `<form method="post">` submits that
mutate and redirect (303) — no client JS. A shared `AdminNav` component provides
the left column across admin pages.

**Tech Stack:** Hono + Hono JSX (`hono/jsx`), TypeScript (strict,
`module: NodeNext`), Tailwind v4, Cloudflare Workers + D1 (SQLite), bcryptjs.
Tests: `node --test` (Node 24 native TS type-stripping) + `tsx` loader +
`node:sqlite`.

## Global Constraints

- **Testing:** Model-layer logic is test-driven with `node:test`. Tests live
  under `tests/` and run via `npm test` →
  `NODE_OPTIONS="--import tsx" node --test "tests/**/*.test.ts"`. The `tsx`
  `--import` (via `NODE_OPTIONS`, so it propagates to the runner's per-file
  child processes) is required to resolve the repo's NodeNext `.js` import
  specifiers to their `.ts` sources. Views and routes (thin JSX/glue) are
  verified by `npm run typecheck` + `npm run build` + the manual browser checks
  in each task; route-level integration tests are a documented follow-up, not
  part of this plan.
- **Tests are tracked.** Test files live under `tests/` and are committed
  alongside the code they cover (each model task commits its test file with the
  model change).
- **`tsconfig.json` typechecks `src` only** (`include: ["src"]`). Test files
  under `tests/` are not typechecked by `tsc`; they run through `tsx` (types
  stripped). Do not add `tests/` to the tsconfig include.
- Strict TypeScript, two-space indentation.
- Keep `.js` extensions on all relative imports, **including** imports of `.tsx`
  files (`module: "NodeNext"`).
- JSX is Hono JSX (`jsxImportSource: "hono/jsx"`), not React: use `class`,
  lowercase handlers, import `FC`/`Child` from `hono/jsx`.
- Preserve the site palette exactly. Light: `bg-amber-50 text-mist-600`; dark:
  `dark:bg-mist-600 dark:text-amber-50`. Inverse UI mirrors it.
- Reuse `src/views/components/ui/*` primitives and `HeaderSlim`; never duplicate
  page structure unnecessarily.
- Never hand-edit or regenerate `public/styles.css` — it is generated output.
- All `/admin*` responses set `Cache-Control: no-store`.
- Redirects after mutations use status `303`.
- D1 bindings use `?1`-style positional parameters. Models follow the `*Row`
  (snake_case) + domain (camelCase) + `xFromRow`/`xToRow` convention.

---

## Task 0: Migration + test harness

Adds the `active` and `body` columns and stands up the `node:sqlite`-backed D1
test harness so Tasks 1–2 can be test-driven.

**Files:**

- Create: `migrations/0004_admin_management.sql`
- Modify: `package.json` (add `test` script)
- Create: `tests/helpers/d1.ts`
- Create: `tests/helpers/harness.test.ts` (smoke test)

**Interfaces:**

- Produces:
  - `createTestDb(): D1Database` — fresh in-memory DB with all migrations
    applied.
  - `seedUser(db, input: { email: string; username: string; passwordHash?: string; active?: 0 | 1 }): Promise<number>`
    — inserts a user, returns its id.

- [ ] **Step 1: Write the migration**

Create `migrations/0004_admin_management.sql`:

```sql
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1
  CHECK (active IN (0, 1));

ALTER TABLE posts ADD COLUMN body TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 2: Add the `test` script**

In `package.json`, add this entry to `scripts` (after `"typecheck"`):

```json
"test": "NODE_OPTIONS=\"--import tsx\" node --test \"tests/**/*.test.ts\""
```

- [ ] **Step 3: Create the D1 test harness**

Create `tests/helpers/d1.ts`:

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

// Minimal D1Database-compatible adapter backed by node:sqlite (the same
// SQLite engine D1 uses). Faithful enough to exercise real model SQL.
class FakeStatement {
  #db: DatabaseSync;
  #sql: string;
  #args: unknown[] = [];

  constructor(db: DatabaseSync, sql: string) {
    this.#db = db;
    this.#sql = sql;
  }

  bind(...values: unknown[]): FakeStatement {
    this.#args = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    const row = this.#db.prepare(this.#sql).get(...(this.#args as never[]));
    return (row ?? null) as T | null;
  }

  async all<T>(): Promise<{
    results: T[];
    success: true;
    meta: Record<string, unknown>;
  }> {
    const results = this.#db
      .prepare(this.#sql)
      .all(...(this.#args as never[])) as T[];
    return { results, success: true, meta: {} };
  }

  async run(): Promise<{
    success: true;
    meta: { last_row_id: number; changes: number };
  }> {
    const info = this.#db.prepare(this.#sql).run(...(this.#args as never[]));
    return {
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid),
        changes: Number(info.changes),
      },
    };
  }
}

class FakeD1 {
  #db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.#db = db;
  }

  prepare(sql: string): FakeStatement {
    return new FakeStatement(this.#db, sql);
  }
}

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

export const createTestDb = (): D1Database => {
  const db = new DatabaseSync(":memory:");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }

  return new FakeD1(db) as unknown as D1Database;
};

export const seedUser = async (
  db: D1Database,
  input: {
    email: string;
    username: string;
    passwordHash?: string;
    active?: 0 | 1;
  },
): Promise<number> => {
  const result = await db
    .prepare(
      `INSERT INTO users (email, username, password_hash, active)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(
      input.email,
      input.username,
      input.passwordHash ?? "hash",
      input.active ?? 1,
    )
    .run();

  return result.meta.last_row_id;
};
```

- [ ] **Step 4: Write the harness smoke test**

Create `tests/helpers/harness.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDb, seedUser } from "./d1.js";

test("createTestDb applies migrations incl. active + body columns", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "a@x.com", username: "alice" });

  const user = await db
    .prepare(`SELECT id, active FROM users WHERE id = ?1`)
    .bind(id)
    .first<{ id: number; active: number }>();
  assert.equal(user?.active, 1);

  const post = await db
    .prepare(
      `INSERT INTO posts (user_id, title, description, body)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(id, "t", "d", "the body")
    .run();
  assert.equal(post.meta.changes, 1);

  const row = await db
    .prepare(`SELECT body FROM posts WHERE id = ?1`)
    .bind(post.meta.last_row_id)
    .first<{ body: string }>();
  assert.equal(row?.body, "the body");
});
```

- [ ] **Step 5: Apply the migration locally**

Run: `npm run db:migrate:local` Expected: wrangler reports migration
`0004_admin_management.sql` applied, no errors.

- [ ] **Step 6: Run the harness smoke test**

Run: `npm test` Expected: PASS (`pass 1 fail 0`). This proves the harness
applies migrations and the adapter's `bind`/`first`/`all`/`run` behave like D1.

- [ ] **Step 7: Commit**

```bash
git add migrations/0004_admin_management.sql package.json tests/helpers/d1.ts tests/helpers/harness.test.ts
git commit -m "chore(admin): add migration and node:test D1 harness"
```

---

## Task 1: User model (TDD)

Adds `active` and the user queries the management pages need, driven by tests.

**Files:**

- Create: `tests/models/user.test.ts`
- Modify: `src/models/user.ts`

**Interfaces:**

- Consumes: `createTestDb`, `seedUser` (Task 0).
- Produces:
  - `User` gains `active: boolean`.
  - `getAllUsers(db: D1Database): Promise<readonly User[]>`
  - `getUserById(db: D1Database, id: number): Promise<User | null>`
  - `updateUser(db: D1Database, id: number, input: { email: string; username: string }): Promise<void>`
  - `setUserActive(db: D1Database, id: number, active: boolean): Promise<void>`
  - `setUserPassword(db: D1Database, id: number, passwordHash: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Create `tests/models/user.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findUserByLogin,
  getAllUsers,
  getUserById,
  setUserActive,
  setUserPassword,
  updateUser,
} from "../../src/models/user.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("getUserById maps active to a boolean", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    active: 1,
  });
  const user = await getUserById(db, id);
  assert.ok(user);
  assert.equal(user.active, true);
  assert.equal(user.email, "a@x.com");
  assert.equal(user.username, "alice");
});

test("getUserById returns null for a missing user", async () => {
  const db = createTestDb();
  assert.equal(await getUserById(db, 999), null);
});

test("getAllUsers returns all users ordered by id ascending", async () => {
  const db = createTestDb();
  await seedUser(db, { email: "b@x.com", username: "bob" });
  await seedUser(db, { email: "a@x.com", username: "alice" });
  const users = await getAllUsers(db);
  assert.deepEqual(
    users.map((u) => u.username),
    ["bob", "alice"],
  );
});

test("updateUser changes email and username", async () => {
  const db = createTestDb();
  const id = await seedUser(db, { email: "old@x.com", username: "old" });
  await updateUser(db, id, { email: "new@x.com", username: "new" });
  const user = await getUserById(db, id);
  assert.equal(user?.email, "new@x.com");
  assert.equal(user?.username, "new");
});

test("setUserActive toggles the active flag", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    active: 1,
  });
  await setUserActive(db, id, false);
  assert.equal((await getUserById(db, id))?.active, false);
  await setUserActive(db, id, true);
  assert.equal((await getUserById(db, id))?.active, true);
});

test("setUserPassword updates the stored hash", async () => {
  const db = createTestDb();
  const id = await seedUser(db, {
    email: "a@x.com",
    username: "alice",
    passwordHash: "old",
  });
  await setUserPassword(db, id, "new-hash");
  const row = await findUserByLogin(db, "alice");
  assert.equal(row?.password_hash, "new-hash");
});

test("findUserByLogin matches email or username", async () => {
  const db = createTestDb();
  await seedUser(db, { email: "a@x.com", username: "alice" });
  assert.equal((await findUserByLogin(db, "a@x.com"))?.username, "alice");
  assert.equal((await findUserByLogin(db, "alice"))?.email, "a@x.com");
  assert.equal(await findUserByLogin(db, "nobody"), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` Expected: FAIL — `user.test.ts` errors on load because
`getAllUsers`/`getUserById`/`updateUser`/`setUserActive`/`setUserPassword` are
not exported yet.

- [ ] **Step 3: Implement the user model**

Replace the contents of `src/models/user.ts` with:

```ts
export interface User {
  id: number;
  email: string;
  username: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Actually stored in the database.
export interface UserRow {
  id: number;
  email: string;
  username: string;
  password_hash: string;
  active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  password: string;
}

export interface CreateUserRow {
  email: string;
  username: string;
  password_hash: string;
}

export const userFromRow = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  username: row.username,
  active: row.active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findUserByLogin = async (
  db: D1Database,
  login: string,
): Promise<UserRow | null> =>
  db
    .prepare(
      `SELECT id, email, username, password_hash, active, created_at, updated_at
       FROM users
       WHERE email = ?1 OR username = ?1
       LIMIT 1`,
    )
    .bind(login)
    .first<UserRow>();

export const getAllUsers = async (
  db: D1Database,
): Promise<readonly User[]> => {
  const result = await db
    .prepare(
      `SELECT id, email, username, password_hash, active, created_at, updated_at
       FROM users
       ORDER BY id ASC`,
    )
    .all<UserRow>();

  return result.results.map(userFromRow);
};

export const getUserById = async (
  db: D1Database,
  id: number,
): Promise<User | null> => {
  const row = await db
    .prepare(
      `SELECT id, email, username, password_hash, active, created_at, updated_at
       FROM users
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<UserRow>();

  return row ? userFromRow(row) : null;
};

export const updateUser = async (
  db: D1Database,
  id: number,
  input: { email: string; username: string },
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET email = ?2, username = ?3, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, input.email, input.username)
    .run();
};

export const setUserActive = async (
  db: D1Database,
  id: number,
  active: boolean,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET active = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, active ? 1 : 0)
    .run();
};

export const setUserPassword = async (
  db: D1Database,
  id: number,
  passwordHash: string,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, passwordHash)
    .run();
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test` Expected: PASS (all user + harness tests green).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck` Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/models/user.ts tests/models/user.test.ts
git commit -m "feat(admin): add user.active and admin user queries"
```

---

## Task 2: Post model (TDD)

Adds `body`, keyword helpers, all-posts listing, and create/update/draft
mutations, driven by tests.

**Files:**

- Create: `tests/models/post.test.ts`
- Modify: `src/models/post.ts`

**Interfaces:**

- Consumes: `createTestDb`, `seedUser` (Task 0); `body` column (Task 0).
- Produces:
  - `Post` gains `body: string`.
  - `PostListItem` interface:
    `{ id: number; userId: number; authorUsername: string; draft: boolean; title: string; description: string; createdAt: string; updatedAt: string }`
  - `parseKeywords(input: string): string[]`
  - `formatKeywords(keywords: readonly string[]): string`
  - `getAllPosts(db: D1Database): Promise<readonly PostListItem[]>`
  - `createPost(db: D1Database, input: CreatePostInput): Promise<number>` where
    `CreatePostInput = { userId: number; title: string; description: string; keywords: string[]; image: string; body: string; draft: boolean }`
  - `updatePost(db: D1Database, id: number, input: UpdatePostInput): Promise<void>`
    where
    `UpdatePostInput = { title: string; description: string; keywords: string[]; image: string; body: string; draft: boolean }`
  - `setPostDraft(db: D1Database, id: number, draft: boolean): Promise<void>`
  - Existing `getPostById` / `getPostsForUser` now return `body`.

- [ ] **Step 1: Write the failing tests**

Create `tests/models/post.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPost,
  formatKeywords,
  getAllPosts,
  getPostById,
  parseKeywords,
  setPostDraft,
  updatePost,
} from "../../src/models/post.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("parseKeywords splits, trims, and drops blanks", () => {
  assert.deepEqual(parseKeywords("Hono, Cloudflare ,, D1 "), [
    "Hono",
    "Cloudflare",
    "D1",
  ]);
  assert.deepEqual(parseKeywords(""), []);
});

test("formatKeywords joins with a comma and space", () => {
  assert.equal(formatKeywords(["Hono", "Cloudflare"]), "Hono, Cloudflare");
});

test("createPost then getPostById round-trips fields", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    title: "First",
    description: "desc",
    keywords: ["a", "b"],
    image: "https://img",
    body: "hello world",
    draft: true,
  });
  const post = await getPostById(db, id);
  assert.ok(post);
  assert.equal(post.title, "First");
  assert.equal(post.body, "hello world");
  assert.equal(post.image, "https://img");
  assert.equal(post.draft, true);
  assert.deepEqual(post.keywords, ["a", "b"]);
});

test("updatePost overwrites fields and draft state", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    title: "t",
    description: "d",
    keywords: [],
    image: "",
    body: "b",
    draft: true,
  });
  await updatePost(db, id, {
    title: "t2",
    description: "d2",
    keywords: ["x"],
    image: "i",
    body: "b2",
    draft: false,
  });
  const post = await getPostById(db, id);
  assert.equal(post?.title, "t2");
  assert.equal(post?.body, "b2");
  assert.equal(post?.draft, false);
  assert.deepEqual(post?.keywords, ["x"]);
});

test("setPostDraft toggles only the draft flag", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, { email: "a@x.com", username: "alice" });
  const id = await createPost(db, {
    userId,
    title: "t",
    description: "d",
    keywords: [],
    image: "",
    body: "b",
    draft: false,
  });
  await setPostDraft(db, id, true);
  assert.equal((await getPostById(db, id))?.draft, true);
});

test("getAllPosts includes author username, newest id first", async () => {
  const db = createTestDb();
  const alice = await seedUser(db, { email: "a@x.com", username: "alice" });
  const bob = await seedUser(db, { email: "b@x.com", username: "bob" });
  const first = await createPost(db, {
    userId: alice,
    title: "first",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: false,
  });
  const second = await createPost(db, {
    userId: bob,
    title: "second",
    description: "",
    keywords: [],
    image: "",
    body: "",
    draft: true,
  });
  const posts = await getAllPosts(db);
  assert.equal(posts.length, 2);
  // created_at has 1s resolution, so the id DESC tiebreak decides order.
  assert.equal(posts[0].id, second);
  assert.equal(posts[0].authorUsername, "bob");
  assert.equal(posts[1].id, first);
  assert.equal(posts[1].authorUsername, "alice");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test` Expected: FAIL — `post.test.ts` errors on load because
`parseKeywords`/`formatKeywords`/`getAllPosts`/`createPost`/`updatePost`/`setPostDraft`
are not exported yet.

- [ ] **Step 3: Add `body` to interfaces and mappers**

In `src/models/post.ts`, add `body: string;` to `Post` (after `image`) and
`body: string;` to `PostRow` (after `image`). In `postFromRow`, add
`body: row.body,` (after `image: row.image,`). In `postToRow`, add
`body: post.body,` (after `image: post.image,`).

Result for reference:

```ts
export interface Post {
  id: number;
  userId: number;
  draft: boolean;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  comments: readonly BlogComment[];
}

export interface PostRow {
  id: number;
  user_id: number;
  draft: 0 | 1;
  title: string;
  description: string;
  keywords: string;
  image: string;
  body: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 4: Add `body` to the two existing SELECT column lists**

In `getPostById` and `getPostsForUser`, change
`... image, created_at, updated_at` to
`... image, body, created_at, updated_at`. Both `SELECT` lists must include
`body`.

- [ ] **Step 5: Append the keyword helpers and new queries**

Add to the end of `src/models/post.ts`:

```ts
export const parseKeywords = (input: string): string[] =>
  input
    .split(",")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);

export const formatKeywords = (keywords: readonly string[]): string =>
  keywords.join(", ");

export interface PostListItem {
  id: number;
  userId: number;
  authorUsername: string;
  draft: boolean;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface PostListRow {
  id: number;
  user_id: number;
  author_username: string;
  draft: 0 | 1;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const getAllPosts = async (
  db: D1Database,
): Promise<readonly PostListItem[]> => {
  const result = await db
    .prepare(
      `SELECT p.id, p.user_id, u.username AS author_username, p.draft,
              p.title, p.description, p.created_at, p.updated_at
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all<PostListRow>();

  return result.results.map((row) => ({
    id: row.id,
    userId: row.user_id,
    authorUsername: row.author_username,
    draft: row.draft === 1,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

export interface CreatePostInput {
  userId: number;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  draft: boolean;
}

export const createPost = async (
  db: D1Database,
  input: CreatePostInput,
): Promise<number> => {
  const result = await db
    .prepare(
      `INSERT INTO posts (user_id, draft, title, description, keywords, image, body)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      input.userId,
      input.draft ? 1 : 0,
      input.title,
      input.description,
      JSON.stringify(input.keywords),
      input.image,
      input.body,
    )
    .run();

  return result.meta.last_row_id;
};

export interface UpdatePostInput {
  title: string;
  description: string;
  keywords: string[];
  image: string;
  body: string;
  draft: boolean;
}

export const updatePost = async (
  db: D1Database,
  id: number,
  input: UpdatePostInput,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE posts
       SET draft = ?2, title = ?3, description = ?4, keywords = ?5,
           image = ?6, body = ?7, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(
      id,
      input.draft ? 1 : 0,
      input.title,
      input.description,
      JSON.stringify(input.keywords),
      input.image,
      input.body,
    )
    .run();
};

export const setPostDraft = async (
  db: D1Database,
  id: number,
  draft: boolean,
): Promise<void> => {
  await db
    .prepare(
      `UPDATE posts
       SET draft = ?2, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?1`,
    )
    .bind(id, draft ? 1 : 0)
    .run();
};
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test` Expected: PASS (all post + user + harness tests green).

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck` Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/models/post.ts tests/models/post.test.ts
git commit -m "feat(admin): add post body, listing, and create/update/draft queries"
```

---

## Task 3: Shared AdminNav + AdminHome landing page

Introduces the shared left-nav column and rewires `/admin` to a landing page.
Also exports `buttonVariants` so anchors can be styled as buttons (avoiding
invalid `<a><button></a>` nesting).

**Files:**

- Modify: `src/views/components/ui/Button.tsx` (export `buttonVariants`)
- Create: `src/views/components/admin/AdminNav.tsx`
- Create: `src/views/AdminHome.tsx`
- Modify: `src/routes/auth.tsx` (rewire `GET /admin`)

**Interfaces:**

- Consumes: `getAllPosts`, `getAllUsers` (Tasks 1–2); `PostListItem`.
- Produces: `buttonVariants` (from `ui/Button.tsx`);
  `AdminNav: FC<{ current: string }>`;
  `AdminHome: FC<{ posts: readonly PostListItem[]; userCount: number }>`.

- [ ] **Step 1: Export `buttonVariants`**

In `src/views/components/ui/Button.tsx`, change `const buttonVariants = cva(` to
`export const buttonVariants = cva(`. No other changes.

- [ ] **Step 2: Create the AdminNav component**

Create `src/views/components/admin/AdminNav.tsx`:

```tsx
import type { FC } from "hono/jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.js";

export type AdminNavItem = {
  label: string;
  link: string;
  description: string;
};

export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", link: "/admin", description: "Admin home" },
  { label: "Posts", link: "/admin/posts", description: "Manage posts" },
  { label: "Users", link: "/admin/users", description: "Manage users" },
  { label: "Write", link: "/admin/write", description: "New post" },
];

type AdminNavProps = {
  current: string;
};

export const AdminNav: FC<AdminNavProps> = ({ current }) => (
  <Card class="min-w-0 self-start border-chocolate-500/50 bg-linear-to-b from-onyx-900 to-onyx-950 text-onyx-50 dark:border-chocolate-400/50">
    <CardHeader class="border-b border-onyx-700">
      <CardTitle class="text-xl text-chocolate-300">Manage</CardTitle>
    </CardHeader>
    <CardContent>
      <nav aria-label="Admin">
        <ul class="flex flex-col gap-2">
          {adminNavItems.map((item) => {
            const isCurrent = item.link === current;
            return (
              <li>
                <a
                  aria-current={isCurrent ? "page" : undefined}
                  class={isCurrent
                    ? "block rounded-lg border border-chocolate-400 bg-onyx-900/70 px-3 py-2"
                    : "block rounded-lg border border-onyx-700 bg-onyx-900/70 px-3 py-2 transition-colors hover:border-chocolate-400"}
                  href={item.link}
                >
                  <span class="block text-sm font-medium">{item.label}</span>
                  <span class="block text-xs text-onyx-300">
                    {item.description}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </CardContent>
  </Card>
);
```

- [ ] **Step 3: Create the AdminHome view**

Create `src/views/AdminHome.tsx`:

```tsx
import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminHomeProps = {
  posts: readonly PostListItem[];
  userCount: number;
};

export const AdminHome: FC<AdminHomeProps> = ({ posts, userCount }) => {
  const meta: LayoutMeta = {
    title: "Admin | Shipping Binaries",
    robots: "noindex",
  };
  const recent = posts.slice(0, 5);

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin" />

        <Card class="min-w-0 bg-linear-to-br from-onyx-50 via-chocolate-50/60 to-burgundy-50 dark:from-onyx-950 dark:via-onyx-900 dark:to-burgundy-950">
          <CardHeader class="border-b border-burgundy-200 dark:border-burgundy-900">
            <CardTitle class="text-2xl text-burgundy-700 dark:text-burgundy-300">
              Overview
            </CardTitle>
            <CardDescription>Recent activity across the site.</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            {recent.length === 0
              ? (
                <div class="rounded-lg border border-dashed border-burgundy-300 px-4 py-8 text-center text-sm dark:border-burgundy-800">
                  No posts yet.{" "}
                  <a class="underline" href="/admin/write">
                    Write your first post
                  </a>
                  .
                </div>
              )
              : (
                <ol class="flex flex-col gap-2">
                  {recent.map((post) => (
                    <li class="flex items-center justify-between gap-3 rounded-lg border border-burgundy-200 bg-amber-50/60 p-3 dark:border-burgundy-900 dark:bg-onyx-950/40">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{post.title}</p>
                        <p class="truncate text-xs text-onyx-600 dark:text-onyx-300">
                          by {post.authorUsername}
                        </p>
                      </div>
                      <Badge variant={post.draft ? "draft" : "published"}>
                        {post.draft ? "Draft" : "Published"}
                      </Badge>
                    </li>
                  ))}
                </ol>
              )}
          </CardContent>
        </Card>

        <aside class="flex min-w-0 flex-col gap-4">
          <h2 class="px-1 text-xl font-semibold text-burgundy-700 dark:text-burgundy-300">
            Quick links
          </h2>
          <Card class="gap-4 border-chocolate-300/70 py-5 dark:border-chocolate-800">
            <CardContent class="flex flex-col gap-3 px-5">
              <a class={cn(buttonVariants(), "w-full")} href="/admin/write">
                New post
              </a>
              <a
                class={cn(buttonVariants({ variant: "outline" }), "w-full")}
                href="/admin/posts"
              >
                Manage posts ({posts.length})
              </a>
              <a
                class={cn(buttonVariants({ variant: "outline" }), "w-full")}
                href="/admin/users"
              >
                Manage users ({userCount})
              </a>
            </CardContent>
          </Card>
        </aside>
      </main>
    </Layout>
  );
};
```

- [ ] **Step 4: Rewire `GET /admin`**

In `src/routes/auth.tsx`:

Replace `import { getPostsForUser } from "../models/post.js";` with:

```ts
import { getAllPosts } from "../models/post.js";
```

Replace `import { findUserByLogin, type User } from "../models/user.js";` with:

```ts
import { findUserByLogin, getAllUsers, type User } from "../models/user.js";
```

Add the view import near the other view imports:

```ts
import { AdminHome } from "../views/AdminHome.js";
```

Replace the existing `GET /admin` handler (the block rendering
`<Dashboard posts={posts} />`) with:

```ts
authRoute.get("/admin", async (c) => {
  c.header("Cache-Control", "no-store");
  const [posts, users] = await Promise.all([
    getAllPosts(c.env.DB),
    getAllUsers(c.env.DB),
  ]);

  return c.html(<AdminHome posts={posts} userCount={users.length} />);
});
```

Leave the `import { Dashboard } from "../views/Dashboard.js";` line for now —
Task 4 removes it along with the file. (tsconfig has no `noUnusedLocals`, so the
lingering import does not fail typecheck.)

- [ ] **Step 5: Typecheck, build, tests**

Run: `npm run typecheck && npm run build && npm test` Expected: all PASS.

- [ ] **Step 6: Manual browser check**

Run `npm run dev:worker`, log in at `/login`, visit
`http://localhost:8787/admin`. Expected: 20/60/20 layout, left "Manage" nav
(Overview/Posts/Users/Write), middle Overview panel, right Quick links. Palette
matches the rest of the site in light and dark mode.

- [ ] **Step 7: Commit**

```bash
git add src/views/components/ui/Button.tsx src/views/components/admin/AdminNav.tsx src/views/AdminHome.tsx src/routes/auth.tsx
git commit -m "feat(admin): add shared AdminNav and /admin landing page"
```

---

## Task 4: Write view + write routes (create/edit persistence)

Moves the editor to `/admin/write`, wires create/update, and deletes
`Dashboard.tsx`.

**Files:**

- Create: `src/views/Write.tsx`
- Delete: `src/views/Dashboard.tsx`
- Modify: `src/routes/auth.tsx` (add `GET`/`POST /admin/write`, drop `Dashboard`
  import)

**Interfaces:**

- Consumes: `getPostById`, `createPost`, `updatePost`, `parseKeywords`,
  `formatKeywords`, `type Post`; `c.var.currentUser.id`.
- Produces: `Write: FC<{ post?: Post }>`; routes `GET /admin/write`,
  `POST /admin/write`.

- [ ] **Step 1: Create the Write view**

Create `src/views/Write.tsx`:

```tsx
import type { FC } from "hono/jsx";
import { formatKeywords, type Post } from "../models/post.js";
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
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { Textarea } from "./components/ui/Textarea.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type WriteProps = {
  post?: Post;
};

export const Write: FC<WriteProps> = ({ post }) => {
  const meta: LayoutMeta = {
    title: post ? "Edit post | Shipping Binaries" : "Write | Shipping Binaries",
    robots: "noindex",
  };
  const isDraft = post ? post.draft : true;

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <form
        action="/admin/write"
        class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4 px-4 py-6"
        method="post"
      >
        {post
          ? <input name="id" type="hidden" value={String(post.id)} />
          : null}
        <AdminNav current="/admin/write" />

        <Card class="min-w-0 bg-linear-to-br from-onyx-50 via-chocolate-50/60 to-burgundy-50 dark:from-onyx-950 dark:via-onyx-900 dark:to-burgundy-950">
          <CardHeader class="border-b border-burgundy-200 dark:border-burgundy-900">
            <CardTitle
              class="text-2xl text-burgundy-700 dark:text-burgundy-300"
              id="post-editor-heading"
            >
              {post ? "Edit post" : "Post editor"}
            </CardTitle>
            <CardDescription>Write and format a post.</CardDescription>
          </CardHeader>
          <CardContent
            aria-labelledby="post-editor-heading"
            class="flex min-h-[60vh] flex-col gap-5"
          >
            <label class="flex flex-col gap-2 text-sm font-medium">
              Title
              <Input
                name="title"
                placeholder="Post title"
                value={post?.title ?? ""}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Description
              <Textarea
                class="resize-y"
                name="description"
                placeholder="A one-line summary"
                rows={3}
              >
                {post?.description ?? ""}
              </Textarea>
            </label>
            <label class="flex grow flex-col gap-2 text-sm font-medium">
              Body
              <Textarea
                class="min-h-80 grow resize-y"
                name="body"
                placeholder="Start writing..."
              >
                {post?.body ?? ""}
              </Textarea>
            </label>
          </CardContent>
          <CardFooter class="justify-end gap-2 border-t border-burgundy-200 dark:border-burgundy-900">
            <Button name="action" type="submit" value="draft" variant="outline">
              Save draft
            </Button>
            <Button name="action" type="submit" value="publish">
              Publish
            </Button>
          </CardFooter>
        </Card>

        <aside class="flex min-w-0 flex-col gap-4">
          <h2 class="px-1 text-xl font-semibold text-burgundy-700 dark:text-burgundy-300">
            Tools
          </h2>
          <Card class="gap-4 border-chocolate-500/50 bg-linear-to-br from-burgundy-900 to-burgundy-950 py-5 text-burgundy-50 dark:border-chocolate-400/50">
            <CardHeader class="px-5">
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent class="flex items-center justify-between px-5">
              <span class="text-sm">Status</span>
              <Badge variant={isDraft ? "draft" : "published"}>
                {isDraft ? "Draft" : "Published"}
              </Badge>
            </CardContent>
          </Card>
          <Card class="gap-4 border-burgundy-300/60 py-5 dark:border-burgundy-800">
            <CardHeader class="px-5">
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent class="px-5">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Keywords
                <Input
                  name="keywords"
                  placeholder="Hono, Cloudflare"
                  value={post ? formatKeywords(post.keywords) : ""}
                />
              </label>
            </CardContent>
          </Card>
          <Card class="gap-4 border-chocolate-300/70 py-5 dark:border-chocolate-800">
            <CardHeader class="px-5">
              <CardTitle>Image</CardTitle>
            </CardHeader>
            <CardContent class="px-5">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Image URL
                <Input
                  name="image"
                  placeholder="https://"
                  type="url"
                  value={post?.image ?? ""}
                />
              </label>
            </CardContent>
          </Card>
        </aside>
      </form>
    </Layout>
  );
};
```

- [ ] **Step 2: Delete Dashboard**

Run: `git rm src/views/Dashboard.tsx`

- [ ] **Step 3: Wire the write routes**

In `src/routes/auth.tsx`:

Remove the `import { Dashboard } from "../views/Dashboard.js";` line.

Replace the `import { getAllPosts } from "../models/post.js";` line (from
Task 3) with:

```ts
import {
  createPost,
  getAllPosts,
  getPostById,
  parseKeywords,
  type Post,
  updatePost,
} from "../models/post.js";
```

Add the view import next to `AdminHome`:

```ts
import { Write } from "../views/Write.js";
```

Add these two handlers after the `GET /admin` handler:

```ts
authRoute.get("/admin/write", async (c) => {
  c.header("Cache-Control", "no-store");
  const idParam = c.req.query("id");
  let post: Post | undefined;

  if (idParam) {
    const id = Number.parseInt(idParam, 10);
    if (Number.isInteger(id)) {
      post = (await getPostById(c.env.DB, id)) ?? undefined;
    }
  }

  return c.html(<Write post={post} />);
});

authRoute.post("/admin/write", async (c) => {
  c.header("Cache-Control", "no-store");
  const body = await c.req.parseBody();

  const input = {
    title: typeof body.title === "string" ? body.title : "",
    description: typeof body.description === "string" ? body.description : "",
    keywords: parseKeywords(
      typeof body.keywords === "string" ? body.keywords : "",
    ),
    image: typeof body.image === "string" ? body.image : "",
    body: typeof body.body === "string" ? body.body : "",
    draft: body.action !== "publish",
  };

  const idRaw = typeof body.id === "string" ? body.id : "";
  const id = idRaw ? Number.parseInt(idRaw, 10) : Number.NaN;

  if (idRaw && Number.isInteger(id)) {
    await updatePost(c.env.DB, id, input);
    return c.redirect(`/admin/write?id=${id}`, 303);
  }

  const newId = await createPost(c.env.DB, {
    userId: c.var.currentUser.id,
    ...input,
  });

  return c.redirect(`/admin/write?id=${newId}`, 303);
});
```

- [ ] **Step 4: Typecheck, build, tests**

Run: `npm run typecheck && npm run build && npm test` Expected: all PASS. No
remaining references to `Dashboard`.

- [ ] **Step 5: Manual browser check**

With `npm run dev:worker` running:

1. Visit `/admin/write`, fill fields, click **Publish** → redirect to
   `/admin/write?id=<n>`, Status badge **Published**, fields prefilled.
2. Edit a field, click **Save draft** → reload with Status **Draft** and edited
   content persisted.
3. Confirm keywords round-trip (`Hono, Cloudflare` → JSON → comma-joined).

- [ ] **Step 6: Commit**

```bash
git add src/views/Write.tsx src/routes/auth.tsx
git commit -m "feat(admin): move editor to /admin/write with post persistence"
```

---

## Task 5: Posts management page

Lists all posts with draft-toggle and edit link.

**Files:**

- Create: `src/views/AdminPosts.tsx`
- Modify: `src/routes/auth.tsx` (add `GET /admin/posts`,
  `POST /admin/posts/:id/draft`)

**Interfaces:**

- Consumes: `getAllPosts`, `setPostDraft`, `PostListItem`.
- Produces: `AdminPosts: FC<{ posts: readonly PostListItem[] }>`; routes
  `GET /admin/posts`, `POST /admin/posts/:id/draft`.

- [ ] **Step 1: Create the AdminPosts view**

Create `src/views/AdminPosts.tsx`:

```tsx
import type { FC } from "hono/jsx";
import type { PostListItem } from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button, buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminPostsProps = {
  posts: readonly PostListItem[];
};

export const AdminPosts: FC<AdminPostsProps> = ({ posts }) => {
  const meta: LayoutMeta = {
    title: "Posts | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/posts" />

        <Card class="min-w-0">
          <CardHeader class="border-b border-onyx-200 dark:border-onyx-700">
            <CardTitle class="text-2xl text-burgundy-700 dark:text-burgundy-300">
              Posts
            </CardTitle>
            <CardDescription>
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {posts.length === 0
              ? (
                <div class="rounded-lg border border-dashed border-onyx-300 px-4 py-8 text-center text-sm dark:border-onyx-700">
                  No posts yet.{" "}
                  <a class="underline" href="/admin/write">
                    Write one
                  </a>
                  .
                </div>
              )
              : (
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-sm">
                    <thead class="border-b border-onyx-200 text-xs uppercase text-onyx-500 dark:border-onyx-700 dark:text-onyx-400">
                      <tr>
                        <th class="py-2 pr-4 font-medium">Title</th>
                        <th class="py-2 pr-4 font-medium">Author</th>
                        <th class="py-2 pr-4 font-medium">Status</th>
                        <th class="py-2 pr-4 font-medium">Updated</th>
                        <th class="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr class="border-b border-onyx-100 last:border-0 dark:border-onyx-800">
                          <td class="max-w-xs truncate py-3 pr-4 font-medium">
                            {post.title}
                          </td>
                          <td class="py-3 pr-4 text-onyx-600 dark:text-onyx-300">
                            {post.authorUsername}
                          </td>
                          <td class="py-3 pr-4">
                            <Badge variant={post.draft ? "draft" : "published"}>
                              {post.draft ? "Draft" : "Published"}
                            </Badge>
                          </td>
                          <td class="py-3 pr-4 text-onyx-600 dark:text-onyx-300">
                            {post.updatedAt}
                          </td>
                          <td class="py-3 pr-4">
                            <div class="flex items-center gap-2">
                              <a
                                class={cn(
                                  buttonVariants({
                                    size: "sm",
                                    variant: "outline",
                                  }),
                                )}
                                href={`/admin/write?id=${post.id}`}
                              >
                                Edit
                              </a>
                              <form
                                action={`/admin/posts/${post.id}/draft`}
                                method="post"
                              >
                                <input
                                  name="draft"
                                  type="hidden"
                                  value={post.draft ? "0" : "1"}
                                />
                                <Button size="sm" type="submit" variant="ghost">
                                  {post.draft ? "Publish" : "Unpublish"}
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
```

- [ ] **Step 2: Wire the posts routes**

In `src/routes/auth.tsx`, add `setPostDraft` to the post-model import:

```ts
import {
  createPost,
  getAllPosts,
  getPostById,
  parseKeywords,
  type Post,
  setPostDraft,
  updatePost,
} from "../models/post.js";
```

Add the view import:

```ts
import { AdminPosts } from "../views/AdminPosts.js";
```

Add these handlers after the write handlers:

```ts
authRoute.get("/admin/posts", async (c) => {
  c.header("Cache-Control", "no-store");
  const posts = await getAllPosts(c.env.DB);

  return c.html(<AdminPosts posts={posts} />);
});

authRoute.post("/admin/posts/:id/draft", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (Number.isInteger(id)) {
    const body = await c.req.parseBody();
    await setPostDraft(c.env.DB, id, body.draft === "1");
  }

  return c.redirect("/admin/posts", 303);
});
```

- [ ] **Step 3: Typecheck, build, tests**

Run: `npm run typecheck && npm run build && npm test` Expected: all PASS.

- [ ] **Step 4: Manual browser check**

With `npm run dev:worker` running, visit `/admin/posts`. Expected: table of all
posts (all authors), each with a Status badge, an **Edit** button linking to
`/admin/write?id=<n>`, and a **Publish/Unpublish** button that toggles draft and
returns to the list with the badge updated.

- [ ] **Step 5: Commit**

```bash
git add src/views/AdminPosts.tsx src/routes/auth.tsx
git commit -m "feat(admin): add /admin/posts management page with draft toggle"
```

---

## Task 6: Users management page + edit form

Lists all users with an active toggle and an edit form (email, username,
password reset, active).

**Files:**

- Create: `src/views/AdminUsers.tsx`
- Create: `src/views/AdminUserEdit.tsx`
- Modify: `src/routes/auth.tsx` (add users routes)

**Interfaces:**

- Consumes: `getAllUsers`, `getUserById`, `updateUser`, `setUserActive`,
  `setUserPassword`, `type User`; `hashPassword`.
- Produces: `AdminUsers: FC<{ users: readonly User[] }>`,
  `AdminUserEdit: FC<{ user: User }>`; routes `GET /admin/users`,
  `POST /admin/users/:id/active`, `GET /admin/users/:id/edit`,
  `POST /admin/users/:id`.

- [ ] **Step 1: Create the AdminUsers view**

Create `src/views/AdminUsers.tsx`:

```tsx
import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Badge } from "./components/ui/Badge.js";
import { Button, buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminUsersProps = {
  users: readonly User[];
};

export const AdminUsers: FC<AdminUsersProps> = ({ users }) => {
  const meta: LayoutMeta = {
    title: "Users | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/users" />

        <Card class="min-w-0">
          <CardHeader class="border-b border-onyx-200 dark:border-onyx-700">
            <CardTitle class="text-2xl text-burgundy-700 dark:text-burgundy-300">
              Users
            </CardTitle>
            <CardDescription>
              {users.length} {users.length === 1 ? "user" : "users"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="border-b border-onyx-200 text-xs uppercase text-onyx-500 dark:border-onyx-700 dark:text-onyx-400">
                  <tr>
                    <th class="py-2 pr-4 font-medium">Username</th>
                    <th class="py-2 pr-4 font-medium">Email</th>
                    <th class="py-2 pr-4 font-medium">Status</th>
                    <th class="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr class="border-b border-onyx-100 last:border-0 dark:border-onyx-800">
                      <td class="py-3 pr-4 font-medium">{user.username}</td>
                      <td class="py-3 pr-4 text-onyx-600 dark:text-onyx-300">
                        {user.email}
                      </td>
                      <td class="py-3 pr-4">
                        <Badge variant={user.active ? "published" : "draft"}>
                          {user.active ? "Active" : "Deactivated"}
                        </Badge>
                      </td>
                      <td class="py-3 pr-4">
                        <div class="flex items-center gap-2">
                          <a
                            class={cn(
                              buttonVariants({
                                size: "sm",
                                variant: "outline",
                              }),
                            )}
                            href={`/admin/users/${user.id}/edit`}
                          >
                            Edit
                          </a>
                          <form
                            action={`/admin/users/${user.id}/active`}
                            method="post"
                          >
                            <input
                              name="active"
                              type="hidden"
                              value={user.active ? "0" : "1"}
                            />
                            <Button size="sm" type="submit" variant="ghost">
                              {user.active ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
};
```

- [ ] **Step 2: Create the AdminUserEdit view**

Create `src/views/AdminUserEdit.tsx`:

```tsx
import type { FC } from "hono/jsx";
import type { User } from "../models/user.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AdminUserEditProps = {
  user: User;
};

export const AdminUserEdit: FC<AdminUserEditProps> = ({ user }) => {
  const meta: LayoutMeta = {
    title: "Edit user | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
      />
      <main class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-[minmax(0,1fr)_minmax(0,4fr)] gap-4 px-4 py-6">
        <AdminNav current="/admin/users" />

        <Card class="min-w-0 max-w-xl">
          <CardHeader class="border-b border-onyx-200 dark:border-onyx-700">
            <CardTitle class="text-2xl text-burgundy-700 dark:text-burgundy-300">
              Edit user
            </CardTitle>
            <CardDescription>
              Update account details for {user.username}.
            </CardDescription>
          </CardHeader>
          <form action={`/admin/users/${user.id}`} method="post">
            <CardContent class="flex flex-col gap-5 pt-6">
              <label class="flex flex-col gap-2 text-sm font-medium">
                Email
                <Input name="email" type="email" value={user.email} />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                Username
                <Input name="username" value={user.username} />
              </label>
              <label class="flex flex-col gap-2 text-sm font-medium">
                New password
                <Input
                  autocomplete="new-password"
                  name="password"
                  placeholder="Leave blank to keep current"
                  type="password"
                />
              </label>
              <label class="flex items-center gap-2 text-sm font-medium">
                <input
                  checked={user.active}
                  class="size-4"
                  name="active"
                  type="checkbox"
                  value="1"
                />
                Active
              </label>
            </CardContent>
            <CardFooter class="justify-end gap-2 border-t border-onyx-200 pt-6 dark:border-onyx-700">
              <a
                class="text-sm text-onyx-600 underline dark:text-onyx-300"
                href="/admin/users"
              >
                Cancel
              </a>
              <Button type="submit">Save changes</Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </Layout>
  );
};
```

- [ ] **Step 3: Wire the users routes**

In `src/routes/auth.tsx`:

Replace
`import { findUserByLogin, getAllUsers, type User } from "../models/user.js";`
(from Task 3) with:

```ts
import {
  findUserByLogin,
  getAllUsers,
  getUserById,
  setUserActive,
  setUserPassword,
  updateUser,
  type User,
} from "../models/user.js";
```

Change `import { verifyPassword } from "../auth/password.js";` to:

```ts
import { hashPassword, verifyPassword } from "../auth/password.js";
```

Add the view imports:

```ts
import { AdminUserEdit } from "../views/AdminUserEdit.js";
import { AdminUsers } from "../views/AdminUsers.js";
```

Add these handlers after the posts handlers (register `:id/active` and
`:id/edit` before the bare `:id` POST):

```ts
authRoute.get("/admin/users", async (c) => {
  c.header("Cache-Control", "no-store");
  const users = await getAllUsers(c.env.DB);

  return c.html(<AdminUsers users={users} />);
});

authRoute.post("/admin/users/:id/active", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (Number.isInteger(id)) {
    const body = await c.req.parseBody();
    await setUserActive(c.env.DB, id, body.active === "1");
  }

  return c.redirect("/admin/users", 303);
});

authRoute.get("/admin/users/:id/edit", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);
  const user = Number.isInteger(id) ? await getUserById(c.env.DB, id) : null;

  if (!user) {
    return c.notFound();
  }

  return c.html(<AdminUserEdit user={user} />);
});

authRoute.post("/admin/users/:id", async (c) => {
  c.header("Cache-Control", "no-store");
  const id = Number.parseInt(c.req.param("id"), 10);

  if (!Number.isInteger(id)) {
    return c.redirect("/admin/users", 303);
  }

  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const username = typeof body.username === "string"
    ? body.username.trim()
    : "";
  const password = typeof body.password === "string" ? body.password : "";

  await updateUser(c.env.DB, id, { email, username });
  await setUserActive(c.env.DB, id, body.active === "1");

  if (password.length > 0) {
    await setUserPassword(c.env.DB, id, await hashPassword(password));
  }

  return c.redirect("/admin/users", 303);
});
```

- [ ] **Step 4: Typecheck, build, tests**

Run: `npm run typecheck && npm run build && npm test` Expected: all PASS.

- [ ] **Step 5: `git diff --check`**

Run: `git diff --check` Expected: no whitespace errors.

- [ ] **Step 6: Manual browser check**

With `npm run dev:worker` running:

1. `/admin/users` lists all users with an **Active/Deactivated** badge, an
   **Edit** link, and a **Deactivate/Activate** toggle. Toggle a user and
   confirm the badge flips.
2. `/admin/users/<id>/edit` prefills email, username, and the Active checkbox
   (password blank). Change the email and save → back on the list with the new
   email. Toggle Active via the checkbox and confirm it persists.
3. Set a new password, save, log out, and log in with the new password to
   confirm the reset works.

- [ ] **Step 7: Commit**

```bash
git add src/views/AdminUsers.tsx src/views/AdminUserEdit.tsx src/routes/auth.tsx
git commit -m "feat(admin): add /admin/users management and user edit form"
```

---

## Verification (whole feature)

After Task 6, run the full gate:

```sh
npm test
npm run typecheck
npm run build
git diff --check
```

Then exercise, with `npm run dev:worker`:

1. `/admin` → management nav + overview.
2. `/admin/write` → create (Save draft and Publish), reload via `?id=`.
3. `/admin/posts` → list all posts, toggle draft, Edit opens editor.
4. `/admin/users` → list users, deactivate/reactivate, edit details incl.
   password reset.

## Notes / out of scope

- Login is **not** blocked for deactivated users in this plan (avoids locking
  out the sole owner); `findUserByLogin` still authenticates regardless of
  `active`. Enforcing `active` at login is a deliberate follow-up.
- Route/view integration tests (driving `app.request()` with a seeded session +
  the D1 harness) are a viable follow-up but out of scope; this plan test-drives
  the model layer only.
- No comment moderation, no public rendering of post `body`, no user
  creation/deletion from the UI (still `npm run account:create`).
- The production D1 migration (`npm run db:migrate:remote`) is a deploy-time
  step, run when shipping — not part of task implementation.
- Test files under `tests/` are committed alongside the code they cover.
