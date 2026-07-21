# Repository Guide

## Project shape

- This is a server-rendered Hono site written in TypeScript and Hono JSX.
- `src/index.tsx` creates the app and owns route registration. Add page routes there.
- Page views live in `src/views/`, shared page chrome in `src/views/layouts/`, and reusable UI in `src/views/components/`.
- `src/dev.ts` is the plain Node server entrypoint. `src/app.ts` re-exports the Hono app for deployment.
- `src/styles.css` is the Tailwind v4 source. `public/styles.css` is generated output; change the source stylesheet or component utility classes, then rebuild it.
- Static files belong under `public/` and are referenced from the site root, for example `/styles.css`.
- `wrangler.jsonc` is the Cloudflare Workers deployment source of truth. It binds the production D1 database as `DB`, publishes `public/` as Workers static assets, and routes the apex domain to the Worker.

## Local workflow

Use npm and keep `package-lock.json` in sync with dependency changes.

```sh
npm install
npm run dev
```

`npm run dev` builds CSS once, then runs Vite and the Tailwind watcher together. Vite defaults to `http://localhost:3000` and provides the normal live-reload workflow. `npm start` runs the standalone Node server and does not provide Vite live reload.

Use `npm run dev:worker` when testing Cloudflare bindings locally. Set `DATABASE_URL` to a local Wrangler persistence directory; it defaults to `.wrangler/state` when unset. The production D1 database ID is committed in `wrangler.jsonc` because it is an identifier, not a secret.

Before handing off changes, run:

```sh
npm run typecheck
npm run build
git diff --check
```

There is currently no automated test script. Exercise affected routes in the browser when behavior or layout changes.

## Code conventions

- Preserve strict TypeScript and the existing two-space formatting.
- Keep `.js` extensions on relative imports; the project uses `module: "NodeNext"`.
- Import Hono JSX types such as `FC` and `Child` from `hono/jsx`.
- Hono JSX uses HTML-style attributes in this codebase, including `class` and lowercase event attributes such as `onclick`.
- Reuse `Layout` and `Header` rather than duplicating page structure. Keep route-specific metadata with its page view.
- Preserve the site palette exactly: light mode uses `bg-amber-50` with `text-mist-600`; dark mode reverses that to `dark:bg-mist-600` with `dark:text-amber-50`.
- Inverse-color UI such as the header control bar mirrors the page palette: `bg-mist-600 text-amber-50` in light mode and `dark:bg-amber-50 dark:text-mist-600` in dark mode.
- Use Tailwind utilities for UI changes and do not edit or regenerate `public/styles.css`; the user's running Tailwind watcher owns that generated file.

## Reference

- Hono documentation for language models: https://hono.dev/llms-small.txt

## Deployment

Run `npm run deploy` to deploy the Hono app, static assets, D1 binding, and `shippingbinaries.com` custom domain with Wrangler. Do not commit `dist/`, `.wrangler/`, dependency directories, or environment files.
