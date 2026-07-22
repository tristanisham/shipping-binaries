import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../../src/index.js";
import { getPostById, setPostDraft } from "../../src/models/post.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const createAdminSession = async (db: D1Database): Promise<string> => {
  const userId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });

  await db
    .prepare(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?1, (SELECT id FROM roles WHERE name = 'admin'))`,
    )
    .bind(userId)
    .run();

  return createSession(db, userId);
};

const autosave = (
  db: D1Database,
  token: string,
  values: Record<string, string>,
) =>
  app.request(
    "/admin/write",
    {
      body: new URLSearchParams({
        action: "autosave",
        body: "Body",
        currentDraft: "1",
        description: "Description",
        image: "",
        keywords: "Hono, Alpine",
        slug: "autosaved-post",
        title: "Autosaved post",
        ...values,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );

test("autosave creates a draft and returns its id as JSON", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const response = await autosave(db, token, {});

  assert.equal(response.status, 201);
  const result = await response.json() as {
    id: number;
    saved: boolean;
    slug: string;
  };
  assert.equal(result.saved, true);
  assert.equal(result.slug, "autosaved-post");

  const post = await getPostById(db, result.id);
  assert.equal(post?.title, "Autosaved post");
  assert.equal(post?.draft, true);
});

test("autosave updates an existing post without changing published state", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const created = await autosave(db, token, {});
  const { id } = await created.json() as { id: number };
  await setPostDraft(db, id, false);

  const response = await autosave(db, token, {
    currentDraft: "0",
    id: String(id),
    title: "Updated by autosave",
  });

  assert.equal(response.status, 200);
  const result = await response.json() as {
    id: number;
    saved: boolean;
    slug: string;
  };
  assert.deepEqual(result, { id, saved: true, slug: "autosaved-post" });

  const post = await getPostById(db, id);
  assert.equal(post?.title, "Updated by autosave");
  assert.equal(post?.draft, false);
});

test("autosave generates a unique slug from the title in automatic mode", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const first = await autosave(db, token, {
    slug: "",
    slugMode: "auto",
    title: "Generated Slug",
  });
  const second = await autosave(db, token, {
    slug: "",
    slugMode: "auto",
    title: "Generated Slug",
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal((await first.json() as { slug: string }).slug, "generated-slug");
  assert.equal(
    (await second.json() as { slug: string }).slug,
    "generated-slug-2",
  );
});

test("autosave rejects malformed custom slugs", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const response = await autosave(db, token, {
    slug: "Not a valid slug",
    slugMode: "custom",
  });

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: {
      slug: "Use lowercase letters, numbers, and single hyphens only.",
    },
    saved: false,
  });
  const count = await db.prepare("SELECT COUNT(*) AS count FROM posts")
    .first<{ count: number }>();
  assert.equal(count?.count, 0);
});

test("autosave rejects a custom slug already used by another post", async () => {
  const db = createTestDb();
  const token = await createAdminSession(db);
  const first = await autosave(db, token, { slug: "chosen-slug" });
  const response = await autosave(db, token, { slug: "chosen-slug" });

  assert.equal(first.status, 201);
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: { slug: "That slug is already used by another post." },
    saved: false,
  });
});
