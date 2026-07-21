# Repository Guide

## Project shape

- This is a server-rendered Hono site written in TypeScript and Hono JSX.
- `src/index.tsx` creates the app and owns route registration. Add page routes there.
- Page views live in `src/views/`, shared page chrome in `src/views/layouts/`, and reusable UI in `src/views/components/`.
- `src/dev.ts` is the plain Node server entrypoint. `src/app.ts` re-exports the Hono app for deployment.
- `src/styles.css` is the Tailwind v4 source. `public/styles.css` is generated output; change the source stylesheet or component utility classes, then rebuild it.
- Static files belong under `public/` and are referenced from the site root, for example `/styles.css`.

## Local workflow

Use npm and keep `package-lock.json` in sync with dependency changes.

```sh
npm install
npm run dev
```

`npm run dev` builds CSS once, then runs Vite and the Tailwind watcher together. Vite defaults to `http://localhost:3000` and provides the normal live-reload workflow. `npm start` runs the standalone Node server and does not provide Vite live reload.

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
- Follow the existing amber/mist light-dark palette and Tailwind utilities for UI changes. Avoid adding custom CSS when a clear utility already exists.

## Reference

- Hono documentation for language models: https://hono.dev/llms-small.txt

## Deployment

`vercel.json` declares the Hono framework, runs CSS generation plus TypeScript compilation, and publishes `dist`. Keep deployment behavior aligned with that configuration and do not commit `dist/`, `.vercel/`, dependency directories, or environment files.
