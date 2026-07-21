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

weatherRoute.get("/api/weather", async (c) => {
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

    c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=900");

    return c.json({
      icon: observation.properties?.icon ?? "",
      shortForecast:
        observation.properties?.textDescription ?? "Current conditions",
      temperatureF: Math.round((temperatureC * 9) / 5 + 32),
    });
  } catch {
    return c.json({ error: "weather is unavailable" }, 502);
  }
});
