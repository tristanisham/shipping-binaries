import type { FC } from "hono/jsx";

// Project API key. PostHog calls this a "write-only" key and expects it to ship
// in client HTML, so it lives in source rather than a binding.
const POSTHOG_TOKEN = "phc_yHwbvtaPMGzoVcRrDMGUZg8jEkbYhG9WAsvejPQRqQYB";

// US Cloud ingestion host. The snippet derives the asset host from this by
// swapping ".i.posthog.com" for "-assets.i.posthog.com".
const POSTHOG_API_HOST = "https://us.i.posthog.com";

// Dated snapshot of PostHog's recommended config. From 2025-05-24 onward
// capture_pageview defaults to "history_change", which is what makes
// capture_pageleave fire — see the explicit setting below.
const POSTHOG_DEFAULTS = "2026-06-25";

// Hosts that should never send events; keeps `npm run dev` out of the project.
const localHostnames = /^(localhost|127\.0\.0\.1|\[::1\])$/;

// The loader is PostHog's published HTML snippet, copied verbatim. It stubs
// window.posthog so calls queue up, then async-loads /static/array.js.
const posthogSnippet = `
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
if (!${localHostnames.toString()}.test(window.location.hostname)) {
  posthog.init("${POSTHOG_TOKEN}", {
    api_host: "${POSTHOG_API_HOST}",
    defaults: "${POSTHOG_DEFAULTS}",
    // Pairs $pageview with a $pageleave on unload. Without it PostHog reports
    // bounce rate and session duration from pageviews alone, which is wrong.
    capture_pageleave: true,
  });
}
`;

export const PostHogSnippet: FC = () => (
  <script dangerouslySetInnerHTML={{ __html: posthogSnippet }} />
);
