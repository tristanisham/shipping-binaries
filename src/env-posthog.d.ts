// Extends the generated Worker Env with optional PostHog configuration.
// Set POSTHOG_API_KEY via `.dev.vars` locally or `wrangler secret put` in production.
interface Env {
  POSTHOG_API_KEY?: string;
  POSTHOG_HOST?: string;
}
