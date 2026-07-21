# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

shippingbinaries.com — a server-rendered personal site/blog built with Hono and Hono JSX (TypeScript), styled with Tailwind CSS v4, and deployed to Cloudflare Workers with a D1 (SQLite) database. There is no client-side framework; pages are rendered on the server and returned as HTML.

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

There is no test suite and no linter. Before handing off changes, run:

```sh
npm run typecheck
npm run build
git diff --check
```

Exercise affected routes in the browser when behavior or layout changes.

## Architecture

Two entrypoints share one Hono app:

- `src/index.tsx` creates the `Hono<{ Bindings: Env }>` app and owns all route registration (page routes inline, feature routers mounted via `app.route("/", ...)`). This is also the Worker entry (`main` in `wrangler.jsonc`); `src/app.ts` just re-exports it.
- `src/dev.ts` wraps the same app in `@hono/node-server` for a plain Node run (`npm start`); it adds static-file serving that Workers gets from the `assets` config instead.

Layout of `src/`:

- `routes/` — feature routers (`auth.tsx`: login/logout/`/admin`; `weather.ts`: `/api/weather` proxying the NWS Cleveland observation with caching).
- `views/` — one file per page; `views/layouts/MainLayout.tsx` exports `Layout` (HTML shell, meta tags, dark-mode bootstrap script); `views/components/` for reusable UI.
- `models/` — D1 data access. Convention: a snake_case `*Row` interface mirroring the table, a camelCase domain interface, and `xFromRow`/`xToRow` mappers; queries use prepared statements with `?1`-style bindings on the `D1Database` from `c.env.DB`.
- `auth/password.ts` — bcryptjs hashing (cost 10, rejects >72-byte passwords).
- `cli/create-owner.ts` — owner bootstrap script that shells out to `wrangler d1 execute`.
- `worker-configuration.d.ts` — generated Worker/`Env` types; regenerate with `npm run types:worker`, don't hand-edit.

Auth flow: `POST /login` verifies credentials (comparing against a dummy hash on unknown users to keep timing constant), stores a session row keyed by the SHA-256 hash of a random token, and sets the raw token in an httpOnly `shipping_session` cookie (7-day TTL). The `requireSession` middleware in `src/routes/auth.tsx` guards `/admin` and `/admin/*`, putting the user on `c.var.currentUser`. Auth pages set `Cache-Control: no-store`.

Database: schema lives in numbered SQL files in `migrations/` (users, sessions, posts + comments), applied with the `db:migrate:*` scripts. The production D1 database ID committed in `wrangler.jsonc` is an identifier, not a secret. `wrangler.jsonc` is the deployment source of truth: it binds D1 as `DB`, publishes `public/` as static assets, and routes the `shippingbinaries.com` apex domain.

## Conventions

- Strict TypeScript, two-space formatting. Keep `.js` extensions on relative imports (`module: "NodeNext"`), including imports of `.tsx` files.
- JSX is Hono JSX (`jsxImportSource: "hono/jsx"`), not React. Import types like `FC` and `Child` from `hono/jsx`, and use HTML-style attributes: `class`, lowercase event handlers like `onclick`.
- Reuse `Layout` and `Header` rather than duplicating page structure; keep route-specific metadata (the `meta` prop) with its page view.
- Styling: edit `src/styles.css` (Tailwind v4 source) or component utility classes. Never edit or regenerate `public/styles.css` by hand — it is generated output owned by the running Tailwind watcher.
- Preserve the site palette exactly: light mode `bg-amber-50 text-mist-600`, dark mode `dark:bg-mist-600 dark:text-amber-50`. Inverse-color UI (e.g. the header control bar) mirrors it: `bg-mist-600 text-amber-50` / `dark:bg-amber-50 dark:text-mist-600`.
- Static files go under `public/` and are referenced from the site root (e.g. `/styles.css`).
- Use npm and keep `package-lock.json` in sync with dependency changes. Do not commit `dist/`, `.wrangler/`, dependency directories, or environment files.

## Reference

- `AGENTS.md` carries the same guidance; keep the two files consistent when conventions change.
- Hono documentation for language models: https://hono.dev/llms-small.txt
