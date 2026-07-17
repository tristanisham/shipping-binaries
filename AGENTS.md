# Repository Guidelines

> **`CLAUDE.md` is the authoritative guide.** This file is a short summary; if
> the two ever conflict, trust `CLAUDE.md`.

## Project Structure & Module Organization

A Hono life blog deployed on Vercel: mostly-static, server-rendered TSX with
hydrated client islands, styled with Tailwind CSS v4.

- `src/index.ts` — Hono app; mounts routers and is the Vercel function entry.
- `src/dev.ts` — local entry (serves the app and `/static` via `@hono/node-server`).
- `src/routers/` — route logic only, no JSX (`.ts`). Handlers render by calling
  view functions, e.g. `c.html(Home({ currentPath: c.req.path }))`.
- `src/views/` — everything render-related (`.tsx`): `layouts/`, `components/`,
  and generic per-route views at the root.
- `src/client/index.tsx` — client hydration entry (island registry).
- `src/styles/app.css` — Tailwind entry.
- `content/posts/` — Markdown blog posts.
- `scripts/` — `build.mjs`, `dev.mjs`, and shared esbuild config.
- `public/static/` — generated build output (gitignored).

## Build, Test, and Development Commands

- `npm install` installs the locked dependency tree.
- `npm run dev` watches the CSS and client bundle and runs the server (via `tsx`)
  at `http://localhost:3000`.
- `npm run build` produces `public/static/{app.css,client.js}`.
- `npm run typecheck` (`tsc --noEmit`) is the verification gate.

Local dev uses `tsx` because Node's native TS support cannot transform JSX.

## Coding Style & Naming Conventions

TypeScript ES modules, strict typing, two-space indentation, single quotes, no
semicolons. Avoid `any` unless an external boundary forces it. `camelCase` for
variables/functions, `PascalCase` for types/components, lowercase router
filenames (e.g. `blog.ts`). Local imports use the `.js` extension even for
`.ts`/`.tsx` source. Use Hono JSX attributes (`class`, not `className`). Keep
handlers short — rendering belongs in views, not routers.

## Hydration

Interactive components ("islands") render statically on the server and mount on
the client via `hono/jsx/dom`. Wrap server markup in `<Island name="…" props={…}>`
and register the component in `src/client/index.tsx`. See `Counter.tsx`.

## Testing Guidelines

No automated test framework is configured. For every change run
`npm run typecheck`, then exercise affected routes via `npm run dev` — for
islands, confirm interactivity in the browser, not just that they render. If
tests are added, place them beside their modules as `*.test.ts`, add an
`npm test` script, and cover success, validation, and error paths.

## Commit & Pull Request Guidelines

Use concise, imperative commit subjects (e.g. `Add health check route`); keep
each commit focused. PRs should explain the behavior change, list verification
commands, link relevant issues, and include request/response examples for API
changes. Never commit credentials, `.env` files, or deployment tokens. Do not
open a pull request unless explicitly asked.
