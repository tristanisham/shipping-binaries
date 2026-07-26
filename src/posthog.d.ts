// The PostHog snippet in views/components/analytics/PostHog.tsx attaches the
// SDK to window; this types any code that reaches for it.
import type { PostHog } from "@posthog/types";

declare global {
  interface Window {
    posthog?: PostHog;
  }
}

export {};
