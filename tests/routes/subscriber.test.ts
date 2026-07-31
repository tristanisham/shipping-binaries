import assert from "node:assert/strict";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import app from "../../src/index.js";
import { createPost } from "../../src/models/post.js";
import {
  getSubscriberByEmail,
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
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  method: "POST",
});

test("anonymous capture sends confirmation once and attributes its label", async () => {
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
      } as Env,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "/blog/subscription-source?subscription=subscribed#email-capture",
  );
  assert.ok(await getSubscriberByEmail(db, "reader@example.com"));
  assert.equal(sentEmails.length, 1);
  assert.match(sentEmails[0].subject, /thank you for subscribing/i);
  assert.match(sentEmails[0].html ?? "", /href="https:\/\/shippingbinaries\.com\/signup"/);
  assert.match(sentEmails[0].text ?? "", /manage your subscription/i);
  assert.equal(analyticsBodies.length, 1);
  assert.match(analyticsBodies[0], /email subscription captured/);
  assert.match(analyticsBodies[0], /"form_label":"Article footer"/);
  assert.match(analyticsBodies[0], /"post_slug":"subscription-source"/);
  assert.doesNotMatch(analyticsBodies[0], /reader@example\.com/i);

  const duplicate = await app.request(
    "/blog/subscription-source/subscribe",
    formRequest(),
    { DB: db, EMAIL: emailBinding } as Env,
  );
  assert.equal(duplicate.status, 303);
  assert.equal(sentEmails.length, 1);
});

test("anonymous existing-user email redirects to login", async () => {
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

test("signed-in readers subscribe with their account email", async () => {
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
  assert.ok(await getSubscriberByEmail(db, "member@example.com"));

  const subscribedPage = await app.request(
    "/blog/subscription-source",
    { headers },
    { DB: db } as Env,
  );
  assert.match(await subscribedPage.text(), /You&#39;re subscribed\./);
});

test("failed confirmation removes the new subscriber so it can retry", async () => {
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
      { DB: db, EMAIL: emailBinding } as Env,
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.status, 500);
  assert.equal(await getSubscriberByEmail(db, "reader@example.com"), null);
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
