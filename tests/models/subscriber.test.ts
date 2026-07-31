import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getSubscriberByEmail,
  subscribe,
} from "../../src/models/subscriber.js";
import { createTestDb } from "../helpers/d1.js";

test("subscribers normalize unique emails and expose metadata", async () => {
  const db = createTestDb();
  const first = await subscribe(db, " Reader@Example.com ");
  const duplicate = await subscribe(db, "reader@example.com");

  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.subscriber.id, first.subscriber.id);
  assert.equal(first.subscriber.email, "reader@example.com");
  assert.match(first.subscriber.createdAt, /^\d{4}-\d{2}-\d{2}/);
  assert.match(first.subscriber.updatedAt, /^\d{4}-\d{2}-\d{2}/);

  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM subscribers")
    .first<{ count: number }>();
  assert.equal(count?.count, 1);
  assert.equal(
    (await getSubscriberByEmail(db, "READER@example.com"))?.id,
    first.subscriber.id,
  );
});
