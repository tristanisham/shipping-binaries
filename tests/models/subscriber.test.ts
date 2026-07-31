import assert from "node:assert/strict";
import { test } from "node:test";
import {
  confirmSubscription,
  getAllSubscribers,
  getSubscriberByEmail,
  preparePendingSubscription,
  releasePendingSubscription,
  subscribeUser,
  unsubscribeSubscriber,
} from "../../src/models/subscriber.js";
import { updateAccountProfile } from "../../src/models/profile.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("anonymous subscribers stay pending until a single-use token is claimed", async () => {
  const db = createTestDb();
  const first = await preparePendingSubscription(db, " Reader@Example.com ");
  const duplicate = await preparePendingSubscription(db, "reader@example.com");

  assert.ok(first.confirmationToken);
  assert.equal(duplicate.confirmationToken, null);
  assert.equal(duplicate.subscriber.id, first.subscriber.id);
  assert.equal(first.subscriber.email, "reader@example.com");
  assert.equal(first.subscriber.confirmedAt, null);
  assert.match(first.subscriber.createdAt, /^\d{4}-\d{2}-\d{2}/);
  assert.match(first.subscriber.updatedAt, /^\d{4}-\d{2}-\d{2}/);

  const confirmed = await confirmSubscription(
    db,
    first.confirmationToken as string,
  );
  assert.equal(confirmed?.id, first.subscriber.id);
  assert.ok(confirmed?.confirmedAt);
  assert.equal(
    await confirmSubscription(db, first.confirmationToken as string),
    null,
  );

  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM subscribers")
    .first<{ count: number }>();
  assert.equal(count?.count, 1);
});

test("a failed send releases only its claim and preserves pending state", async () => {
  const db = createTestDb();
  const first = await preparePendingSubscription(db, "reader@example.com");
  assert.ok(first.confirmationToken);

  await releasePendingSubscription(
    db,
    first.subscriber.id,
    first.confirmationToken as string,
  );

  const pending = await getSubscriberByEmail(db, "reader@example.com");
  assert.equal(pending?.confirmedAt, null);
  assert.equal(pending?.confirmationSentAt, null);

  const retry = await preparePendingSubscription(db, "reader@example.com");
  assert.ok(retry.confirmationToken);
  assert.notEqual(retry.confirmationToken, first.confirmationToken);
});

test("signed-in subscriptions attach to users and follow account email changes", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "old@example.com",
    username: "member",
  });
  const subscriber = await subscribeUser(db, userId, "old@example.com");

  assert.equal(subscriber.userId, userId);
  assert.ok(subscriber.confirmedAt);

  await updateAccountProfile(db, userId, {
    biography: "",
    email: "new@example.com",
    label: null,
    username: "member",
  });

  assert.equal(await getSubscriberByEmail(db, "old@example.com"), null);
  assert.equal(
    (await getSubscriberByEmail(db, "new@example.com"))?.userId,
    userId,
  );
});

test("confirmed subscribers can be snoozed without deleting their history", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });
  const subscriber = await subscribeUser(db, userId, "member@example.com");

  assert.equal((await getAllSubscribers(db)).length, 1);
  assert.equal(await unsubscribeSubscriber(db, subscriber.id), true);

  const snoozed = await getSubscriberByEmail(db, "member@example.com");
  assert.ok(snoozed?.unsubscribedAt);
  assert.equal(snoozed?.id, subscriber.id);
  assert.equal((await getAllSubscribers(db)).length, 1);
});
