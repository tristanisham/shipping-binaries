# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project overview

shippingbinaries.com — a server-rendered personal site/blog built with Hono and
Hono JSX (TypeScript), styled with Tailwind CSS v4, and deployed to Cloudflare
Workers with a D1 (SQLite) database. There is no client-side framework; pages
are rendered on the server and returned as HTML.

## Commands

```sh
npm install
npm run dev            # build CSS once, then run Vite (http://localhost:3000) + Tailwind watcher
npm run dev:worker     # wrangler dev — use when testing Cloudflare bindings (DB, assets) locally
npm run typecheck      # tsc --noEmit
npm run build          # builds/minifies public/styles.css
npm run deploy         # wrangler deploy (app, static assets, D1 binding, custom domain)

npm run db:migrate:local    # apply migrations/ to the local D1 database
npm run db:migrate:remote   # apply migrations/ to the production D1 database
npm run account:create      # create/update the owner user; needs OWNER_EMAIL, OWNER_USERNAME,
                            # OWNER_PASSWORD (and OWNER_DATABASE=local|remote, default local);
                            # reads .env via --env-file-if-exists
```

Local Wrangler state persists to `${DATABASE_URL:-.wrangler/state}`.

Tests live in `tests/` and run on `node --test` with a `node:sqlite` stand-in
for D1 (`tests/helpers/d1.ts` applies `migrations/` to an in-memory database, so
model SQL and schema constraints are exercised for real). There is no linter;
`npm run fmt` is `deno fmt`. Before handing off changes, run:

```sh
npm run typecheck
npm test
npm run build
git diff --check
```

Exercise affected routes in the browser when behavior or layout changes.

## Architecture

Two entrypoints share one Hono app:

- `src/index.tsx` creates the `Hono<{ Bindings: Env }>` app and owns all route
  registration (page routes inline, feature routers mounted via
  `app.route("/", ...)`). This is also the Worker entry (`main` in
  `wrangler.jsonc`); `src/app.ts` just re-exports it.
- `src/dev.ts` wraps the same app in `@hono/node-server` for a plain Node run
  (`npm start`); it adds static-file serving that Workers gets from the `assets`
  config instead.

Layout of `src/`:

- `routes/` — feature routers (`auth.tsx`: login/logout/`/admin`; `blog.tsx`:
  `/blog`, `/blog/:slug`, comment posting, and `/@username` author pages;
  `feeds.ts`: the syndication feeds; `weather.ts`: `/api/weather` proxying the
  NWS Cleveland observation with caching).
- `feeds/feed.ts` — feed building on the `feed` package, plus the canonical
  paths (`BLOG_FEED_PATHS`, `authorFeedPaths`) and autodiscovery link helpers.
  Both the whole blog and each author are served in three formats: RSS 2.0
  (`/rss`, `/@username/rss`), Atom 1.0 (`/feed.xml`, `/@username/feed.xml`), and
  JSON Feed (`/feed.json`, `/@username/feed.json`). A feed's whole path set goes
  in as `feedLinks`, which is what gives each format its own `rel="self"`. Items
  are summary-only (the post's description, else an excerpt of the body); pages
  advertise their feeds through `LayoutMeta.feeds`. The package needs no node
  builtins, so the Worker builds without `nodejs_compat`.
  RSS names the author in `<dc:creator>`, not `<author>`: RSS 2.0 requires an
  email address there and the W3C feed validator flags a bare name. The package
  declares `xmlns:dc` only for `content:encoded` and exposes no root-attribute
  hook, so `withDublinCoreNamespace` splices the declaration into its output —
  tests cover both that splice and that no feed uses an undeclared prefix.
- `views/` — one file per page; `views/layouts/MainLayout.tsx` exports `Layout`
  (HTML shell, meta tags, dark-mode bootstrap script); `views/components/` for
  reusable UI.
- `models/` — D1 data access. Convention: a snake_case `*Row` interface
  mirroring the table, a camelCase domain interface, and `xFromRow`/`xToRow`
  mappers; queries use prepared statements with `?1`-style bindings on the
  `D1Database` from `c.env.DB`.
- `views/components/analytics/PostHog.tsx` — PostHog's HTML snippet, rendered by
  `Layout` at the end of `<head>`. The project API key is write-only and lives
  in the file; `capture_pageleave` is set explicitly (bounce rate and session
  duration depend on it) and init is skipped on localhost. `@posthog/types`
  types `window.posthog` via `src/posthog.d.ts`.
- `auth/password.ts` — bcryptjs hashing (cost 10, rejects >72-byte passwords).
- `cli/create-owner.ts` — owner bootstrap script that shells out to
  `wrangler d1 execute`.
- `worker-configuration.d.ts` — generated Worker/`Env` types; regenerate with
  `npm run types:worker`, don't hand-edit.

Auth flow: `POST /login` verifies credentials (comparing against a dummy hash on
unknown users to keep timing constant), stores a session row keyed by the
SHA-256 hash of a random token, and sets the raw token in an httpOnly
`shipping_session` cookie. The row and the cookie share one lifetime, chosen by
the "Remember me" checkbox: unchecked gives a 7-day row (`SESSION_TTL_MS`) and a
browser-session cookie with no `Max-Age`, so it dies when the browser closes;
checked gives 30 days (`SESSION_REMEMBER_TTL_MS`) on both. Pass the same
duration to `createSession` and `setSessionCookie` or the row expires while the
browser still presents a valid-looking cookie. The cookie is `Secure` when the
request protocol is https — not when the hostname looks remote, because
`wrangler dev` reports the configured route host (`http://shippingbinaries.com`)
locally. The `requireSession` middleware in
`src/routes/auth.tsx` guards `/admin` and `/admin/*`, putting the user on
`c.var.currentUser`. Auth pages set `Cache-Control: no-store`.

Database: schema lives in numbered SQL files in `migrations/` (users, sessions,
posts + comments), applied with the `db:migrate:*` scripts. Every post has an
author: `posts.user_id` is `NOT NULL` and `REFERENCES users(id) ON DELETE
CASCADE`, so a post can never be written without a real user and an author's
posts go with them rather than being orphaned (D1 enforces foreign keys by
default). Post-reading queries rely on that — they inner-join `users` for the
author's username and label. The production D1
database ID committed in `wrangler.jsonc` is an identifier, not a secret.
`wrangler.jsonc` is the deployment source of truth: it binds D1 as `DB`,
publishes `public/` as static assets, and routes the `shippingbinaries.com` apex
domain.

## Conventions

- Strict TypeScript, two-space formatting. Keep `.js` extensions on relative
  imports (`module: "NodeNext"`), including imports of `.tsx` files.
- JSX is Hono JSX (`jsxImportSource: "hono/jsx"`), not React. Import types like
  `FC` and `Child` from `hono/jsx`, and use HTML-style attributes: `class`,
  lowercase event handlers like `onclick`.
- Reuse `Layout` and `Header` rather than duplicating page structure; keep
  route-specific metadata (the `meta` prop) with its page view.
- Styling: edit `src/styles.css` (Tailwind v4 source) or component utility
  classes. Never edit or regenerate `public/styles.css` by hand — it is
  generated output owned by the running Tailwind watcher.
- Preserve the site palette exactly: light mode `bg-amber-50 text-mist-600`,
  dark mode `dark:bg-mist-600 dark:text-amber-50`. Inverse-color UI (e.g. the
  header control bar) mirrors it: `bg-mist-600 text-amber-50` /
  `dark:bg-amber-50 dark:text-mist-600`.
- Static files go under `public/` and are referenced from the site root (e.g.
  `/styles.css`).
- Use npm and keep `package-lock.json` in sync with dependency changes. Do not
  commit `dist/`, `.wrangler/`, dependency directories, or environment files.

## Reference

- `AGENTS.md` carries the same guidance; keep the two files consistent when
  conventions change.
- Hono documentation for language models: https://hono.dev/llms-small.txt
