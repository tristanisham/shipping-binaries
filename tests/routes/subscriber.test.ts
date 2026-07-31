import assert from "node:assert/strict";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import {
  getSubscriberByEmail,
  subscribeUser,
} from "../../src/models/subscriber.js";
import {
  createSession,
  SESSION_COOKIE_NAME,
} from "../../src/models/session.js";
import { createTestDb, seedUser } from "../helpers/d1.js";

const seedPublishedPost = async (
  db: D1Database,
  input: { keywords?: string[]; slug?: string; title?: string } = {},
): Promise<number> => {
  const userId = await seedUser(db, {
    email: `${input.slug ?? "owner"}@example.com`,
    username: input.slug ?? "owner",
  });
  return createPost(db, {
    body: "",
    description: "",
    draft: false,
    image: "",
    keywords: input.keywords ?? [],
    slug: input.slug ?? "subscription-source",
    title: input.title ?? "Subscription source",
    userId,
  });
};

const formRequest = (
  email = "reader@example.com",
  captureLabel = "Article footer",
): RequestInit => ({
  body: new URLSearchParams({ captureLabel, email }).toString(),
  headers: {
    "cf-connecting-ip": "192.0.2.1",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  method: "POST",
});

const allowRateLimit = {
  limit: async () => ({ success: true }),
} as RateLimit;

const captureToken = (message: EmailMessageBuilder): string => {
  const match = message.text?.match(
    /\/subscribe\/confirm\?token=([a-f0-9]{64})&post=subscription-source/,
  );
  assert.ok(match);
  return match[1];
};

test("anonymous capture sends verification once and activates only after confirmation", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  const sentEmails: EmailMessageBuilder[] = [];
  const emailBinding = {
    send: async (message: EmailMessage | EmailMessageBuilder) => {
      sentEmails.push(message as EmailMessageBuilder);
      return { messageId: `test-${sentEmails.length}` };
    },
  } as SendEmail;
  const analyticsBodies: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = new Uint8Array(await request.arrayBuffer());
    analyticsBodies.push(
      request.headers.get("content-encoding") === "gzip"
        ? gunzipSync(body).toString("utf8")
        : new TextDecoder().decode(body),
    );
    return new Response("{}", { status: 200 });
  };

  let response: Response;
  try {
    response = await app.request(
      "/blog/subscription-source/subscribe",
      formRequest(" Reader@Example.com ", "Article footer"),
      {
        DB: db,
        EMAIL: emailBinding,
        POSTHOG_API_KEY: "phc_test",
        POSTHOG_HOST: "https://posthog.test",
        SUBSCRIBE_RATE_LIMITER: allowRateLimit,
      } as Env,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "/blog/subscription-source?subscription=pending#email-capture",
  );
  assert.equal(
    (await getSubscriberByEmail(db, "reader@example.com"))?.confirmedAt,
    null,
  );
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].subject, /confirm your/i);
  assert.match(sentEmails[0].html ?? "", />Confirm subscription<\/a>/);
  assert.match(sentEmails[0].text ?? "", /create an account/i);
  assert.equal(analyticsBodies.length, 1);
  assert.match(analyticsBodies[0], /email subscription requested/);
  assert.match(analyticsBodies[0], /"form_label":"Article footer"/);
  assert.match(analyticsBodies[0], /"post_slug":"subscription-source"/);
  assert.doesNotMatch(analyticsBodies[0], /reader@example\.com/i);

  const duplicate = await app.request(
    "/blog/subscription-source/subscribe",
    formRequest(),
    {
      DB: db,
      EMAIL: emailBinding,
      SUBSCRIBE_RATE_LIMITER: allowRateLimit,
    } as Env,
  );
  assert.equal(duplicate.status, 303);
  assert.equal(
    duplicate.headers.get("location"),
    "/blog/subscription-source?subscription=pending#email-capture",
  );
  assert.equal(sentEmails.length, 1);

  const token = captureToken(sentEmails[0]);
  const confirmed = await app.request(
    `/subscribe/confirm?token=${token}&post=subscription-source`,
    {},
    { DB: db } as Env,
  );
  assert.equal(confirmed.status, 303);
  assert.equal(
    confirmed.headers.get("location"),
    "/blog/subscription-source?subscription=subscribed#email-capture",
  );
  assert.ok(
    (await getSubscriberByEmail(db, "reader@example.com"))?.confirmedAt,
  );

  const reused = await app.request(
    `/subscribe/confirm?token=${token}&post=subscription-source`,
    {},
    { DB: db } as Env,
  );
  assert.equal(reused.headers.get("location"), "/blog/subscription-source");
});

test("anonymous confirmation email is gated by the Worker rate limiter", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  let emailCalls = 0;
  const response = await app.request(
    "/blog/subscription-source/subscribe",
    formRequest(),
    {
      DB: db,
      EMAIL: {
        send: async () => {
          emailCalls += 1;
          return { messageId: "unexpected" };
        },
      } as SendEmail,
      SUBSCRIBE_RATE_LIMITER: {
        limit: async () => ({ success: false }),
      } as RateLimit,
    } as Env,
  );

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(emailCalls, 0);
  assert.equal(await getSubscriberByEmail(db, "reader@example.com"), null);
});

test("anonymous existing-user email redirects to login before sending", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });

  const response = await app.request(
    "/blog/subscription-source/subscribe",
    formRequest("MEMBER@example.com"),
    { DB: db } as Env,
  );

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login");
  assert.equal(await getSubscriberByEmail(db, "member@example.com"), null);
});

test("signed-in readers subscribe with their linked account email", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  const userId = await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });
  const token = await createSession(db, userId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${token}` };

  const page = await app.request(
    "/blog/subscription-source",
    { headers },
    { DB: db } as Env,
  );
  const pageHtml = await page.text();
  assert.equal(page.status, 200);
  assert.match(pageHtml, /href="\/help">via Email<\/a>/);
  assert.doesNotMatch(pageHtml, /name="email"/);

  const response = await app.request(
    "/blog/subscription-source/subscribe",
    {
      body: new URLSearchParams({
        captureLabel: "Signed-in footer",
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
      method: "POST",
    },
    { DB: db } as Env,
  );
  assert.equal(response.status, 303);
  const subscriber = await getSubscriberByEmail(db, "member@example.com");
  assert.equal(subscriber?.userId, userId);
  assert.ok(subscriber?.confirmedAt);

  const subscribedPage = await app.request(
    "/blog/subscription-source",
    { headers },
    { DB: db } as Env,
  );
  assert.match(await subscribedPage.text(), /You&#39;re subscribed\./);
});

test("a failed send preserves pending state and permits a later retry", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  const emailBinding = {
    send: async () => {
      throw new Error("email delivery failed");
    },
  } as SendEmail;
  const originalConsoleError = console.error;
  console.error = () => {};
  let response: Response;
  try {
    response = await app.request(
      "/blog/subscription-source/subscribe",
      formRequest(),
      {
        DB: db,
        EMAIL: emailBinding,
        SUBSCRIBE_RATE_LIMITER: allowRateLimit,
      } as Env,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.status, 500);
  const pending = await getSubscriberByEmail(db, "reader@example.com");
  assert.ok(pending);
  assert.equal(pending.confirmedAt, null);
  assert.equal(pending.confirmationSentAt, null);
});

test("a failed owner send does not delete a concurrently accepted request", async () => {
  const db = createTestDb();
  await seedPublishedPost(db);
  let rejectSend: (error: Error) => void = () => {};
  let markSendStarted: () => void = () => {};
  const sendStarted = new Promise<void>((resolve) => {
    markSendStarted = resolve;
  });
  const emailBinding = {
    send: async () => {
      markSendStarted();
      return new Promise<never>((_resolve, reject) => {
        rejectSend = reject;
      });
    },
  } as SendEmail;
  const env = {
    DB: db,
    EMAIL: emailBinding,
    SUBSCRIBE_RATE_LIMITER: allowRateLimit,
  } as Env;
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const first = app.request(
      "/blog/subscription-source/subscribe",
      formRequest(),
      env,
    );
    await sendStarted;

    const second = await app.request(
      "/blog/subscription-source/subscribe",
      formRequest(),
      env,
    );
    assert.equal(second.status, 303);
    assert.equal(
      second.headers.get("location"),
      "/blog/subscription-source?subscription=pending#email-capture",
    );

    rejectSend(new Error("email delivery failed"));
    assert.equal((await first).status, 500);
  } finally {
    console.error = originalConsoleError;
  }

  const pending = await getSubscriberByEmail(db, "reader@example.com");
  assert.ok(pending);
  assert.equal(pending.confirmedAt, null);
  assert.equal(pending.confirmationSentAt, null);
});

test("admin subscribers page lists, mails, and indefinitely unsubscribes", async () => {
  const db = createTestDb();
  const adminId = await seedUser(db, {
    email: "owner@example.com",
    username: "owner",
  });
  await db
    .prepare(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES (?1, (SELECT id FROM roles WHERE name = 'admin'))`,
    )
    .bind(adminId)
    .run();
  const memberId = await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });
  const subscriber = await subscribeUser(
    db,
    memberId,
    "member@example.com",
  );
  const session = await createSession(db, adminId);
  const headers = { Cookie: `${SESSION_COOKIE_NAME}=${session}` };

  const page = await app.request(
    "/admin/subscribers",
    { headers },
    { DB: db } as Env,
  );
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /member@example\.com/);
  assert.match(html, /href="mailto:member@example\.com"/);
  assert.match(
    html,
    new RegExp(`/admin/subscribers/${subscriber.id}/unsubscribe`),
  );

  const response = await app.request(
    `/admin/subscribers/${subscriber.id}/unsubscribe`,
    { headers, method: "POST" },
    { DB: db } as Env,
  );
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/admin/subscribers");
  assert.ok(
    (await getSubscriberByEmail(db, "member@example.com"))?.unsubscribedAt,
  );
});

test("non-admin users cannot manage subscribers", async () => {
  const db = createTestDb();
  const userId = await seedUser(db, {
    email: "member@example.com",
    username: "member",
  });
  const session = await createSession(db, userId);

  const response = await app.request(
    "/admin/subscribers",
    { headers: { Cookie: `${SESSION_COOKIE_NAME}=${session}` } },
    { DB: db } as Env,
  );
  assert.equal(response.status, 403);
});

test("help renders only published posts with the page:help supertag", async () => {
  const db = createTestDb();
  await seedPublishedPost(db, {
    keywords: ["PAGE:HELP"],
    slug: "helpful",
    title: "Helpful post",
  });
  await seedPublishedPost(db, {
    keywords: ["guide"],
    slug: "ordinary",
    title: "Ordinary post",
  });

  const response = await app.request("/help", {}, { DB: db } as Env);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<h1[^>]*>Help<\/h1>/);
  assert.match(html, /Helpful post/);
  assert.doesNotMatch(html, /Ordinary post/);
});
