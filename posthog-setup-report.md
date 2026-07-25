# PostHog analytics

Analytics run entirely server-side through `posthog-node`. There is no
client-side script, no cookie set for analytics, and no reverse proxy to
maintain — everything is captured from the Hono handlers on Cloudflare Workers.

## How it works

`src/posthog.ts` is the whole integration surface. Routes never touch the SDK
directly; they call one of four helpers:

| Helper | Use |
|---|---|
| `identifyUser` | Establishes or refreshes a person profile. Called on signup, login, invitation acceptance, and account update. |
| `captureUserEvent` | An action by a known user. Person properties ride along as `$set`, so a returning session keeps its profile current without a separate identify. |
| `captureAnonymousEvent` | An action by someone we cannot name. Sent with `$process_person_profile: false` — no person profile, and roughly a quarter of the cost of an identified event. |
| `capturePageView` | A `$pageview` on a public page. Signed-in readers are attributed to their profile; everyone else is counted against a daily-rotating anonymous id. |
| `captureError` | Wired to `app.onError` in `src/index.tsx`. |

Three decisions worth knowing:

- **The client is per-request, not a singleton.** A module-level client would
  carry I/O from one Worker request into the next, which workerd rejects. Every
  send therefore uses the SDK's `*Immediate` methods, which bypass the batch
  queue — nothing is left pending, so no `flush()` or `shutdown()` is needed.
- **Delivery goes through `executionCtx.waitUntil`.** The response is never held
  up by the round trip to PostHog. Under the Node dev server and in tests there
  is no execution context, so the send is awaited instead.
- **A failed send is logged and swallowed.** Analytics must never break a
  request. With `POSTHOG_API_KEY` unset the whole thing is a no-op, and warns
  once per isolate.

### Anonymous readers

`$pageview` events from logged-out visitors are keyed to
`anon_<sha256(ip + user-agent + UTC date)>`. Nothing reversible is stored, the
id rotates at midnight on its own, and it is good enough to count daily unique
readers. Obvious bots are dropped by user-agent before anything is sent.

Pageviews carry `$ip` so PostHog's GeoIP breakdowns work. Drop that line in
`capturePageView` if you would rather not send it.

## Events

| Event | Trigger | File |
|---|---|---|
| `$pageview` | Any public page: home, about, blog index, blog post, author profile. Carries `page_type` plus post/author metadata. | `src/index.tsx`, `src/routes/blog.tsx` |
| `user signed up` | Registration completed. | `src/routes/auth.tsx` |
| `user logged in` | Authenticated successfully. | `src/routes/auth.tsx` |
| `login failed` | Bad credentials, with `reason` separating unknown login / inactive account / wrong password. Anonymous by design — attributing a failure to the targeted account would let a stranger write to that person's profile. | `src/routes/auth.tsx` |
| `user logged out` | Session ended. | `src/routes/auth.tsx` |
| `password reset requested` | Reset email sent. | `src/routes/auth.tsx` |
| `password reset completed` | New password set from the emailed link. | `src/routes/auth.tsx` |
| `user invited` | Admin invited someone, or resent an invitation (`is_resend`). | `src/routes/auth.tsx` |
| `invitation accepted` | Invitee set a password and activated their account. | `src/routes/auth.tsx` |
| `user activated` / `user deactivated` | Admin toggled account access. | `src/routes/auth.tsx` |
| `post published` | Published from the editor or the admin list (`source`), with `is_new` and `was_draft` separating a first publish from a re-publish. | `src/routes/auth.tsx` |
| `post unpublished` | Taken back to draft from the admin list. | `src/routes/auth.tsx` |
| `post saved as draft` | Explicit draft save. Autosaves are deliberately not tracked. | `src/routes/auth.tsx` |
| `account updated` | Profile saved, with `changed_password` / `changed_email` / `changed_username`. | `src/routes/auth.tsx` |
| `comment submitted` | Comment posted, with `is_reply`. | `src/routes/blog.tsx` |

`user invited → invitation accepted` and `password reset requested →
password reset completed` are complete funnels. Role, permission, and denial
administration is intentionally not tracked.

## Configuration

| Variable | Where |
|---|---|
| `POSTHOG_API_KEY` | Secret. `wrangler secret put POSTHOG_API_KEY` in production, `.dev.vars` locally. |
| `POSTHOG_HOST` | Not a secret — set in `wrangler.jsonc` under `vars`. Defaults to `https://us.i.posthog.com` if unset. |

Types for both live in `src/env-posthog.d.ts`, which extends the generated
`Env` without touching `src/worker-configuration.d.ts`.

## Dashboards

- [Analytics basics dashboard](https://us.posthog.com/project/527653/dashboard/1903693)
- [User signups over time](https://us.posthog.com/project/527653/insights/CibmtbIs)
- [Login activity over time](https://us.posthog.com/project/527653/insights/fFStLz3e)
- [Posts published over time](https://us.posthog.com/project/527653/insights/tcc860v9)
- [Signup to login funnel](https://us.posthog.com/project/527653/insights/qFrEP90i)
- [Comment engagement over time](https://us.posthog.com/project/527653/insights/dofvOPBG)
