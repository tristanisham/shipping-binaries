import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword } from "../../src/auth/password.js";
import app from "../../src/index.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_REMEMBER_TTL_MS,
  SESSION_TTL_MS,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const PASSWORD = "correct horse battery staple";

const seedMember = async (db: D1Database): Promise<void> => {
  await seedUser(db, {
    email: "member@example.com",
    passwordHash: await hashPassword(PASSWORD),
    username: "member",
  });
};

const logIn = async (
  db: D1Database,
  options: { remember?: boolean; origin?: string } = {},
): Promise<Response> => {
  const body: Record<string, string> = {
    login: "member",
    password: PASSWORD,
  };
  if (options.remember) body.remember = "1";

  return await app.request(
    `${options.origin ?? ""}/login`,
    {
      body: new URLSearchParams(body).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db } as Env,
  );
};

// The stored row has to outlive the cookie, or the browser keeps presenting a
// token the server has already forgotten.
const sessionLifetimeMs = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare("SELECT expires_at FROM sessions LIMIT 1")
    .first<{ expires_at: string }>();
  assert.ok(row, "expected a session row");
  return Date.parse(row.expires_at) - Date.now();
};

const HOUR_MS = 60 * 60 * 1000;

test("remember me sets a 30-day cookie and a matching session row", async () => {
  const db = createTestDb();
  await seedMember(db);

  const response = await logIn(db, { remember: true });
  const cookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 303);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(cookie, /Max-Age=2592000/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);

  const lifetime = await sessionLifetimeMs(db);
  assert.ok(
    Math.abs(lifetime - SESSION_REMEMBER_TTL_MS) < HOUR_MS,
    `session row should expire in ~30 days, got ${lifetime}ms`,
  );
});

test("without remember me the cookie is browser-session scoped", async () => {
  const db = createTestDb();
  await seedMember(db);

  const response = await logIn(db);
  const cookie = response.headers.get("set-cookie") ?? "";

  assert.equal(response.status, 303);
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  // No Max-Age and no Expires: discarded when the browser closes.
  assert.doesNotMatch(cookie, /Max-Age/i);
  assert.doesNotMatch(cookie, /Expires=/i);

  const lifetime = await sessionLifetimeMs(db);
  assert.ok(
    Math.abs(lifetime - SESSION_TTL_MS) < HOUR_MS,
    `session row should expire in ~7 days, got ${lifetime}ms`,
  );
});

test("the session cookie is Secure over https and not over http", async () => {
  // Production serves https, so the cookie must carry Secure there.
  const production = createTestDb();
  await seedMember(production);
  const productionCookie =
    (await logIn(production, { origin: "https://shippingbinaries.com" }))
      .headers.get("set-cookie") ?? "";
  assert.match(productionCookie, /Secure/i);

  // Local dev is plain http. Note `wrangler dev` reports the *route* host
  // (http://shippingbinaries.com/...), not localhost, so the protocol — not the
  // hostname — is what has to drive this.
  const dev = createTestDb();
  await seedMember(dev);
  const devCookie =
    (await logIn(dev, { origin: "http://shippingbinaries.com" }))
      .headers.get("set-cookie") ?? "";
  assert.doesNotMatch(devCookie, /Secure/i);
});

test("remember me survives a re-render of the login form", async () => {
  const db = createTestDb();
  await seedMember(db);

  const response = await app.request(
    "/login",
    {
      body: new URLSearchParams({
        login: "member",
        password: "wrong",
        remember: "1",
      }).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
    { DB: db } as Env,
  );

  assert.equal(response.status, 401);
  const html = await response.text();
  assert.match(html, /name="remember"[^>]*value="1"/);
  assert.match(html, /checked/);
});
