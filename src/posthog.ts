import { PostHog } from "posthog-node";

// Creates a per-request PostHog client configured for serverless/Workers environments.
// Returns null when POSTHOG_API_KEY is absent — callers must guard against null.
// Always await posthog.flush() after capturing to ensure the event is sent before
// the Worker response is returned.
export const createPostHogClient = (
  apiKey: string | undefined,
  host: string | undefined,
): PostHog | null => {
  if (!apiKey) {
    console.warn(
      "POSTHOG_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_API_KEY is configured",
    );
    return null;
  }

  return new PostHog(apiKey, {
    host: host ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
};
