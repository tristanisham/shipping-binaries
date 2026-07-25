# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into shippingbinaries.com — a Hono/Cloudflare Workers blog. The `posthog-node` SDK was installed and a per-request client factory (`src/posthog.ts`) was created that reads credentials from the Worker environment and gracefully skips tracking when they are absent. Nine events covering the full user lifecycle — from signup to content creation and community engagement — were instrumented across the auth and blog route files.

| Event | Description | File |
|---|---|---|
| `user signed up` | A new user successfully completed registration. | `src/routes/auth.tsx` |
| `user logged in` | A user successfully authenticated and started a session. | `src/routes/auth.tsx` |
| `user logged out` | A user ended their session by logging out. | `src/routes/auth.tsx` |
| `post published` | A blog post was published (made publicly visible). | `src/routes/auth.tsx` |
| `post saved as draft` | A blog post was explicitly saved as a draft (not an autosave). | `src/routes/auth.tsx` |
| `password reset requested` | A user with an active account requested a password reset email. | `src/routes/auth.tsx` |
| `user invited` | An admin invited a new user by email. | `src/routes/auth.tsx` |
| `account updated` | A user successfully updated their account profile. | `src/routes/auth.tsx` |
| `comment submitted` | A user posted a comment on a blog post. | `src/routes/blog.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) dashboard](https://us.posthog.com/project/527653/dashboard/1903693)
- [User signups over time](https://us.posthog.com/project/527653/insights/CibmtbIs)
- [Login activity over time](https://us.posthog.com/project/527653/insights/fFStLz3e)
- [Posts published over time](https://us.posthog.com/project/527653/insights/tcc860v9)
- [Signup to login funnel](https://us.posthog.com/project/527653/insights/qFrEP90i)
- [Comment engagement over time](https://us.posthog.com/project/527653/insights/dofvOPBG)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] For Cloudflare Workers production deployment, run `wrangler secret put POSTHOG_API_KEY` and `wrangler secret put POSTHOG_HOST` so the Worker has access to these values at runtime.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
