import assert from "node:assert/strict";
import { mock, test } from "node:test";
import app from "../../src/index.js";

// Capture the URL and request the proxy forwards upstream so we can assert on
// host selection and prefix stripping without hitting the network.
const stubFetch = () => {
  const calls: { url: string; method: string; hasCookie: boolean }[] = [];
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input);
      calls.push({
        url: request.url,
        method: request.method,
        hasCookie: request.headers.has("cookie"),
      });
      return new Response("ok", { status: 200 });
    },
  );
  return { calls, restore: () => fetchMock.mock.restore() };
};

test("proxies capture requests to the PostHog capture host", async () => {
  const { calls, restore } = stubFetch();
  try {
    const response = await app.request(
      "/ingest/e/?ip=1",
      {
        method: "POST",
        headers: { cookie: "shipping_session=secret" },
        body: "{}",
      },
      {} as Env,
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://us.i.posthog.com/e/?ip=1");
    assert.equal(calls[0].method, "POST");
    // The reader's session cookie must never leave our domain.
    assert.equal(calls[0].hasCookie, false);
  } finally {
    restore();
  }
});

test("proxies static asset requests to the PostHog asset host", async () => {
  const { calls, restore } = stubFetch();
  try {
    const response = await app.request(
      "/ingest/static/array.js",
      {},
      {} as Env,
    );

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://us-assets.i.posthog.com/static/array.js",
    );
  } finally {
    restore();
  }
});
