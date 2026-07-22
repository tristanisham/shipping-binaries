# Repository Guide

## Project shape

- This is a server-rendered Hono site written in TypeScript and Hono JSX.
- `src/index.tsx` creates the app, mounts route modules, and directly handles
  the public `/` and `/about` pages. Keep related endpoints grouped under
  `src/routes/` rather than growing the entrypoint: `auth.tsx` owns login,
  logout, and `/admin` routes, while `weather.ts` owns `/api/weather`.
- Page views live in `src/views/`, shared page chrome in `src/views/layouts/`,
  and reusable UI in `src/views/components/`.
- `src/dev.ts` is the plain Node server entrypoint. `src/app.ts` re-exports the
  Hono app for deployment.
- Database access belongs in `src/models/`. Schema changes are ordered SQL files
  under `migrations/` and must remain compatible with Cloudflare D1/SQLite.
- Maintenance commands belong in `src/scripts/`; `src/scripts/create-owner.ts`
  backs the `account:create` npm script.
- `src/styles.css` is the Tailwind v4 source. `public/styles.css` is generated
  output owned by the user's running Tailwind watcher; never edit or regenerate
  it as part of agent work.
- Static files belong under `public/` and are referenced from the site root, for
  example `/styles.css`.
- `wrangler.jsonc` is the Cloudflare Workers deployment source of truth. It
  binds D1 as `c.env.DB`, publishes `public/` as Workers static assets, and
  routes both the apex and `www` domains to the Worker.

## Authentication and admin

- Authentication supports multiple users. Roles use the `roles` and
  `user_roles` tables; only users assigned the protected `admin` role may open
  management routes, while every authenticated user may open `/admin/account`.
- Passwords are hashed and verified with `bcryptjs` in `src/auth/password.ts`;
  never store or log plaintext credentials.
- Sessions are stored in D1, use SHA-256 hashes of random bearer tokens, expire
  after seven days, and are referenced by the HTTP-only `shipping_session`
  cookie. Keep token hashing and cookie behavior centralized in
  `src/models/session.ts` and `src/routes/auth.tsx`.
- `requireSession` protects both `/admin` and `/admin/*`; `requireAdmin` protects
  every admin route except `/admin/account`. Unauthenticated requests redirect
  to `/login`; `/logout` deletes the D1 session and clears the cookie.
- `/admin` is the writing/content dashboard, `/admin/roles` manages assignable
  roles, and `/admin/account` is the signed-in user's account page. The built-in
  `admin` role cannot be renamed or deleted, and the Users form must not let an
  administrator remove their own admin access. These pages use `HeaderSlim` and
  send `Cache-Control: no-store`.
- Posts belong to one user, users may own many posts, and comments belong to one
  post. Comment replies are recursive through `parent_id`; public comment
  mutation routes remain intentionally deferred until commenter authentication
  is decided.

## Local workflow

Use npm and keep `package-lock.json` in sync with dependency changes.

```sh
npm install
npm run dev
```

`npm run dev` builds CSS once, then runs Vite and the Tailwind watcher together.
Vite defaults to `http://localhost:3000` and provides the normal live-reload
workflow. `npm start` runs the standalone Node server and does not provide Vite
live reload.

Use `npm run dev:worker` when testing Cloudflare bindings locally. Set
`DATABASE_URL` to a local Wrangler persistence directory; it defaults to
`.wrangler/state` when unset. The production D1 database ID is committed in
`wrangler.jsonc` because it is an identifier, not a secret.

Apply migrations separately to local and production D1:

```sh
npm run db:migrate:local
npm run db:migrate:remote
```

Local Wrangler data lives beneath `DATABASE_URL` (or `.wrangler/state` by
default). Local and remote D1 databases do not synchronize automatically; apply
each new migration to both environments deliberately. Do not point local
development at the production binding.

Create or update the owner interactively in local D1 by default. `--prod` and
`--remote` are equivalent opt-ins to production:

```sh
npm run account:create
npm run account:create -- --remote
```

The script also accepts `OWNER_EMAIL`, `OWNER_USERNAME`, and `OWNER_PASSWORD`
from `.env` or the process environment. Never commit those values or environment
files.

Before handing off changes, run:

```sh
npm run typecheck
git diff --check
```

For Tailwind validation, compile to a temporary file instead of
`public/styles.css`, for example
`npx tailwindcss -i ./src/styles.css -o /tmp/shipping-binaries-styles.css --minify`.
There is currently no automated test script. Exercise affected routes in the
browser when behavior or layout changes; use `npm run dev:worker` for behavior
that depends on D1.

## Code conventions

- Preserve strict TypeScript and the existing two-space formatting.
- Keep `.js` extensions on relative imports; the project uses
  `module: "NodeNext"`.
- Import Hono JSX types such as `FC` and `Child` from `hono/jsx`.
- Hono JSX uses HTML-style attributes in this codebase, including `class` and
  lowercase event attributes such as `onclick`.
- Reuse `Layout` and a header component rather than duplicating page structure.
  `Header` is the full public header; `HeaderSlim` is the compact admin header
  and accepts `size="sm" | "md" | "lg"` plus optional checkerboard display.
- Header navigation items and active-link calculation live in `Header.tsx`. Pass
  authentication and admin-role state into either header and reuse `UserMenu`:
  logged-out users get the `/login` person icon, authenticated non-admin users
  get a person icon linking directly to `/admin/account` without a submenu, and
  admins get the shield icon, `/admin` link, and admin submenu. Do not add
  admin-only links to the public navigation array.
- Keep the weather widget and light/dark toggle behavior shared across both
  header variants. Preserve `HeaderSlim`'s full-width large default unless a
  page explicitly requests another size.
- Keep route-specific metadata with its page view. Authentication and account
  pages should remain `noindex` where already configured.
- Preserve the site palette exactly: light mode uses `bg-amber-50` with
  `text-mist-600`; dark mode reverses that to `dark:bg-mist-600` with
  `dark:text-amber-50`.
- Treat the current page background as the primary button color: amber in
  light mode and mist in dark mode. Primary buttons use
  `bg-amber-50 text-mist-600 dark:bg-mist-600 dark:text-amber-50` so their
  background and contrasting text follow the light/dark toggle. Tertiary
  buttons use `bg-chocolate-500 text-amber-50` with
  `hover:bg-chocolate-400`.
- Inverse-color UI such as the header control bar mirrors the page palette:
  `bg-mist-600 text-amber-50` in light mode and
  `dark:bg-amber-50 dark:text-mist-600` in dark mode.
- Admin forms on inverse panels reuse the tokens in
  `src/views/components/admin/panel.ts`: fields use `panelField`, neutral
  actions use `panelOutlineButton` with the outline variant, and primary save,
  publish, convert, add, or enabled-toggle actions use the chocolate tertiary
  button treatment with amber text or icons. Disabled or inactive toggles must
  return to the neutral transparent toolbar style instead of retaining the
  chocolate active background.
- Keep compact editor and admin icon actions at the small button size, preserve
  accessible labels and titles when replacing visible text with icons, and use
  title-case labels for visible primary actions.
- Destructive icon actions use the `danger` button variant: a light burgundy
  background with amber text or icon color.
- Use Tailwind utilities for UI changes and do not edit or regenerate
  `public/styles.css`; the user's running Tailwind watcher owns that generated
  file.

## Reference

- Hono documentation for language models: https://hono.dev/llms-small.txt

## Deployment

Run `npm run deploy` for a manual Wrangler deployment of the Hono app, static
assets, D1 binding, and custom domains. The GitHub Actions workflow only
installs, typechecks, and builds; Cloudflare owns the connected deployment flow,
so do not add deployment or remote-migration steps to CI without an explicit
request. Do not commit `dist/`, `.wrangler/`, dependency directories, or
environment files.
