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
