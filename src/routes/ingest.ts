import { Hono } from "hono";

// PostHog US Cloud origins. Browser analytics is proxied through this Worker so
// requests come from our own apex domain instead of `*.i.posthog.com`, which
// ad blockers filter by name. `api_host` in
// src/views/components/analytics/PostHog.tsx points the SDK here.
const POSTHOG_CAPTURE_HOST = "us.i.posthog.com";
const POSTHOG_ASSET_HOST = "us-assets.i.posthog.com";

// Mount prefix the SDK sends everything under. The loader derives the asset URL
// by appending "/static/array.js" to `api_host`, so requests under
// `/ingest/static/` must reach the asset host while the rest (`/e`, `/flags`,
// `/decide`, …) reach the capture host.
const INGEST_PREFIX = "/ingest";

export const ingestRoute = new Hono();

ingestRoute.all(`${INGEST_PREFIX}/*`, async (c) => {
  const url = new URL(c.req.url);
  // Recover the upstream path by dropping the mount prefix.
  const upstreamPath = url.pathname.slice(INGEST_PREFIX.length) || "/";
  const isStatic = upstreamPath.startsWith("/static/");
  const host = isStatic ? POSTHOG_ASSET_HOST : POSTHOG_CAPTURE_HOST;
  const target = `https://${host}${upstreamPath}${url.search}`;

  // Static assets (array.js, the recorder, …) are immutable per URL and shared
  // across visitors, so cache them at the edge. The Cache API only exists on
  // the Workers runtime; skip it under plain Node dev. `caches.default` is a
  // Workers extension not present in the DOM CacheStorage type we compile
  // against.
  const cache = isStatic && typeof caches !== "undefined"
    ? (caches as unknown as { default: Cache }).default
    : undefined;
  const cacheKey = new Request(target);

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Rebuild the incoming request against the upstream origin. Drop the Host so
  // fetch derives it from the target, and the cookie since PostHog has no use
  // for this site's session and it should never leave our domain.
  const upstreamRequest = new Request(target, c.req.raw);
  upstreamRequest.headers.delete("host");
  upstreamRequest.headers.delete("cookie");

  const response = await fetch(upstreamRequest);

  if (cache) {
    c.executionCtx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
});
