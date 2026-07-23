import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getProfileForUser,
  getPublicProfileByUsername,
  updateAccountProfile,
} from "../../src/models/profile.js";
import { findUserByLogin } from "../../src/models/user.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

test("profiles belong to users and expose public profile information", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "author@example.com",
    label: "Author Name",
    username: "author",
  });

  const profile = await getProfileForUser(db, userId);
  assert.equal(profile?.userId, userId);
  assert.equal(profile?.biography, "");
  assert.deepEqual(await getPublicProfileByUsername(db, "author"), {
    biography: "",
    id: userId,
    label: "Author Name",
    username: "author",
  });
});

test("account profile updates identity and biography together", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "old@example.com",
    username: "old-name",
  });

  await updateAccountProfile(db, userId, {
    biography: "Developer and writer.",
    email: "new@example.com",
    label: "New Name",
    passwordHash: "new-hash",
    username: "new-name",
  });

  const user = await findUserByLogin(db, "new-name");
  assert.equal(user?.email, "new@example.com");
  assert.equal(user?.label, "New Name");
  assert.equal(user?.password_hash, "new-hash");
  assert.equal(
    (await getProfileForUser(db, userId))?.biography,
    "Developer and writer.",
  );
});
