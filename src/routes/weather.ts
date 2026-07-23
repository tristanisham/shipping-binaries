import { Hono } from "hono";

const clevelandObservationUrl =
  "https://api.weather.gov/stations/KBKL/observations/latest";

type NwsObservation = {
  properties?: {
    icon?: string | null;
    temperature?: {
      value?: number | null;
    };
    textDescription?: string | null;
  };
};

export const weatherRoute = new Hono();

// Fixed-point station that updates roughly hourly, so we cache our small
// synthesized payload at the edge rather than re-hitting NWS on every request.
const cacheControl = "public, max-age=1800, stale-while-revalidate=3600";

weatherRoute.get("/api/weather", async (c) => {
  // The Cache API global only exists on the Workers runtime; skip it in plain
  // Node dev. Key on our own endpoint URL (no query params, so it is stable).
  // `caches.default` is a Workers-runtime extension not present in the DOM
  // CacheStorage type this project compiles against.
  const cache = typeof caches !== "undefined"
    ? (caches as unknown as { default: Cache }).default
    : undefined;
  const cacheKey = new Request(new URL("/api/weather", c.req.url).toString());

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await fetch(clevelandObservationUrl, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "shippingbinaries.com (https://shippingbinaries.com)",
      },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`NWS request failed with ${response.status}`);
    }

    const observation = await response.json() as NwsObservation;
    const temperatureC = observation.properties?.temperature?.value;

    if (typeof temperatureC !== "number") {
      throw new Error("NWS response did not include a temperature");
    }

    const result = c.json({
      icon: observation.properties?.icon ?? "",
      shortForecast: observation.properties?.textDescription ??
        "Current conditions",
      temperatureF: Math.round((temperatureC * 9) / 5 + 32),
    });
    result.headers.set("Cache-Control", cacheControl);

    // Store only our reduced payload; the write runs after the response is
    // sent, and errors above never reach here so failures are not cached.
    if (cache) {
      c.executionCtx.waitUntil(cache.put(cacheKey, result.clone()));
    }

    return result;
  } catch {
    return c.json({ error: "weather is unavailable" }, 502);
  }
});
