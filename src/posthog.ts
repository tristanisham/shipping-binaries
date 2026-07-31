import { PostHog } from "posthog-node";
import { ADMIN_ROLE } from "./models/role.js";

// The slice of the Hono context these helpers need. Declared structurally so
// both the plain `Bindings: Env` routers and the auth router (which adds
// Variables) can pass their context straight through.
export interface AnalyticsContext {
  readonly env: Env;
  readonly req: {
    readonly url: string;
    header(name: string): string | undefined;
  };
  readonly executionCtx: { waitUntil(promise: Promise<unknown>): void };
}

// Enough of a user to identify them. `POST /login` works from a raw user row
// and signup from freshly submitted fields, so roles and label stay optional.
export interface AnalyticsUser {
  readonly id: number;
  readonly email: string;
  readonly username: string;
  readonly label?: string | null;
  readonly roles?: readonly string[];
}

let missingKeyWarned = false;

// Creates a per-request PostHog client configured for serverless/Workers
// environments. Returns null when POSTHOG_API_KEY is absent — callers must
// guard against null. Prefer the capture helpers below over calling this
// directly; they handle delivery and failure isolation.
export const createPostHogClient = (
  apiKey: string | undefined,
  host: string | undefined,
): PostHog | null => {
  if (!apiKey) {
    if (!missingKeyWarned) {
      missingKeyWarned = true;
      console.warn(
        "POSTHOG_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_API_KEY is configured",
      );
    }
    return null;
  }

  return new PostHog(apiKey, {
    host: host ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
};

// Runs `send` against a fresh client and gets the event out of the door.
//
// The client is per-request on purpose: a module-level singleton would carry
// I/O from one Worker request into the next, which workerd rejects. Every
// send therefore uses the SDK's `*Immediate` methods, which bypass the batch
// queue entirely — there is nothing left pending, so no flush or shutdown is
// needed afterwards.
//
// Delivery is handed to `executionCtx.waitUntil` so the response is not held
// up by the round trip to PostHog; under the Node dev server and in tests
// there is no execution context, so the send is awaited instead. Analytics
// must never break a request, so a failed send is logged and swallowed.
const track = async (
  c: AnalyticsContext,
  send: (client: PostHog) => Promise<void>,
): Promise<void> => {
  const client = createPostHogClient(c.env.POSTHOG_API_KEY, c.env.POSTHOG_HOST);
  if (!client) return;

  const delivery = send(client).catch((error: unknown) => {
    console.error("PostHog delivery failed", error);
  });

  try {
    c.executionCtx.waitUntil(delivery);
  } catch {
    await delivery;
  }
};

// Person properties, resent as `$set` on every identified event so a returning
// session keeps the profile current without a separate identify call.
const personProperties = (user: AnalyticsUser): Record<string, unknown> => {
  const properties: Record<string, unknown> = {
    email: user.email,
    username: user.username,
    name: user.label ?? user.username,
  };

  if (user.roles) {
    properties.roles = [...user.roles];
    properties.is_admin = user.roles.includes(ADMIN_ROLE);
  }

  return properties;
};

// Links a distinct id to a person profile. Call on signup, login, and account
// activation — the moments where identity is established or its properties
// change.
export const identifyUser = (
  c: AnalyticsContext,
  user: AnalyticsUser,
): Promise<void> =>
  track(c, (client) =>
    client.identifyImmediate({
      distinctId: String(user.id),
      properties: {
        ...personProperties(user),
        $set_once: { first_seen_at: new Date().toISOString() },
      },
    }));

// An action taken by a known user. Person properties ride along as `$set`.
export const captureUserEvent = (
  c: AnalyticsContext,
  user: AnalyticsUser,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> =>
  track(c, (client) =>
    client.captureImmediate({
      distinctId: String(user.id),
      event,
      properties: { ...properties, $set: personProperties(user) },
    }));

// An action by someone we cannot name — a failed login, a reader. Sent with
// `$process_person_profile: false`, so no person profile is created: anonymous
// events cost a fraction of identified ones and readers stay unprofiled.
export const captureAnonymousEvent = (
  c: AnalyticsContext,
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> =>
  track(c, (client) =>
    client.captureImmediate({
      distinctId,
      event,
      properties: { ...properties, $process_person_profile: false },
    }));

export const captureError = (
  c: AnalyticsContext,
  error: unknown,
  distinctId?: string,
  properties: Record<string, unknown> = {},
): Promise<void> =>
  track(c, (client) =>
    client.captureExceptionImmediate(error, distinctId, properties));

// Requests we never want in the analytics: crawlers, uptime checks, link
// unfurlers. Deliberately broad — a missed human view costs less than a
// dashboard inflated by bots.
const BOT_USER_AGENT =
  /bot|crawler|spider|slurp|curl|wget|headless|lighthouse|monitor|scan|probe|preview|python-requests|go-http-client|node-fetch|axios|feedfetcher|facebookexternalhit|whatsapp|telegram|discord|slack/i;

export const isBotRequest = (userAgent: string | undefined): boolean =>
  !userAgent || BOT_USER_AGENT.test(userAgent);

// A visitor id that is stable for one UTC day: SHA-256 over the client IP, the
// user agent, and the date. Nothing reversible is stored, it rotates at
// midnight on its own, and it is good enough to count daily unique readers.
const anonymousVisitorId = async (c: AnalyticsContext): Promise<string> => {
  const ip = c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    "unknown";
  const userAgent = c.req.header("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}|${userAgent}|${day}`),
  );

  const hex = Array.from(new Uint8Array(digest).slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `anon_${hex}`;
};

// A request-scoped anonymous action. Unlike public page serving, this does not
// discard feed clients or other non-browser agents: those requests are exactly
// what callers such as the feed routes need to measure.
export const captureAnonymousRequestEvent = async (
  c: AnalyticsContext,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> =>
  captureAnonymousEvent(
    c,
    await anonymousVisitorId(c),
    event,
    properties,
  );

// Records delivery of a public page without impersonating PostHog's canonical
// browser `$pageview`. The client snippet owns `$pageview`, sessions, devices,
// and Web Analytics; this server event retains route and content metadata for
// JavaScript-disabled readers and request-level operational reporting.
export const capturePageServed = async (
  c: AnalyticsContext,
  viewer: { readonly viewerUserId?: number | null },
  properties: Record<string, unknown> = {},
): Promise<void> => {
  const userAgent = c.req.header("user-agent");
  if (isBotRequest(userAgent)) return;

  const url = new URL(c.req.url);
  const referrer = c.req.header("referer") ?? "$direct";
  const pageProperties: Record<string, unknown> = {
    ...properties,
    $current_url: url.href,
    $host: url.host,
    $pathname: url.pathname,
    $referrer: referrer,
    $referring_domain: referrer === "$direct"
      ? "$direct"
      : URL.parse(referrer)?.host ?? "$direct",
    // PostHog derives $browser, $os, and $device_type from the raw agent, and
    // $ip drives the GeoIP breakdowns.
    $raw_user_agent: userAgent,
    $ip: c.req.header("cf-connecting-ip"),
    is_authenticated: Boolean(viewer.viewerUserId),
  };

  if (viewer.viewerUserId) {
    return track(c, (client) =>
      client.captureImmediate({
        distinctId: String(viewer.viewerUserId),
        event: "page served",
        properties: pageProperties,
      }));
  }

  return captureAnonymousRequestEvent(c, "page served", pageProperties);
};
