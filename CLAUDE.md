# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Overview

**Shipping Binaries** (`shippingbinaries.com`) is a minimal [Hono](https://hono.dev/)
web application deployed on Vercel. It currently serves a single static HTML page.
The codebase is intentionally small — treat it as a starting point and keep new
additions consistent with the conventions below.

## Tech Stack

- **Runtime:** Node.js `>=22.6` (uses native TypeScript execution and `--watch`)
- **Framework:** Hono `^4` (`hono`)
- **Local server:** `@hono/node-server`
- **Language:** TypeScript `^6`, strict mode, ES modules
- **Deployment:** Vercel (`framework: hono`)
- **No build step, no bundler, no test framework** are configured yet.

## Project Structure

```
.
├── src/
│   ├── index.ts   # Hono app: creates the instance, defines routes, exports app as default
│   └── dev.ts     # Local dev entrypoint: serves app.fetch via @hono/node-server
├── package.json   # Scripts and dependencies
├── tsconfig.json  # Strict TS config, noEmit (type-checking only)
├── vercel.json    # Vercel config; targets src/index.ts as the function entry
├── AGENTS.md      # Older agent notes — partially stale (see below)
└── README.md
```

- `src/index.ts` is the **single source of truth for routes** and exports the Hono
  app as the default export. Vercel uses this file as the serverless function entry.
- `src/dev.ts` imports the app and runs it locally with `@hono/node-server`. It
  imports from `./index.js` (ESM resolution requires the `.js` extension even for
  `.ts` source).

As the app grows: group related handlers under `src/routes/`, put reusable logic
under `src/lib/`, and place static assets in a top-level `public/` directory.

## Commands

```sh
npm install       # install the exact locked dependency tree
npm run dev       # run the local server with auto-reload (node --watch src/dev.ts) on http://localhost:3000
npm start         # run the local server without watch
npm run typecheck # strict type-check with tsc --noEmit (this is the "verification" step)
```

Override the port with the `PORT` environment variable (defaults to `3000`).

There is **no test runner** and **no lint script**. `npm run typecheck` is the
primary verification gate — run it after every change.

## Conventions

- **TypeScript ES modules**, strict typing enabled. Avoid `any` unless an external
  boundary makes it unavoidable.
- **Style:** two-space indentation, single quotes, no semicolons. Match the existing
  files exactly.
- **Naming:** `camelCase` for variables/functions, `PascalCase` for types/classes,
  descriptive lowercase route filenames (e.g. `health.ts`).
- **Imports** between local `.ts` files use the `.js` extension (see `src/dev.ts`
  importing `./index.js`) — this is required by ESM/Bundler resolution.
- Keep route handlers short; extract shared or nontrivial logic into named functions.
- Never commit credentials, `.env` files, or Vercel deployment tokens. Generated
  output, `node_modules/`, and `.vercel` are gitignored.

## Verifying Changes

1. Run `npm run typecheck` — it must pass clean.
2. Run `npm run dev` and exercise the affected route(s) at `http://localhost:3000`.

If tests are introduced later, place them beside their modules as `*.test.ts`, add
a reproducible `npm test` script, and cover success, validation, and error paths.

## Commit & PR Guidelines

- Use concise, imperative commit subjects (e.g. `Add health check route`). Keep each
  commit focused.
- PRs should explain the behavior change, list the verification commands run, link
  relevant issues, and include request/response examples for API changes.
- Do **not** open a pull request unless explicitly asked.

## Note on AGENTS.md

`AGENTS.md` predates the current code and is partially inaccurate — it references
`src/index.tsx`, a Vite dev server with HMR, Tailwind, and `src/styles.css`, none of
which exist. **This CLAUDE.md reflects the actual current state.** If the two conflict,
trust this file, and update `AGENTS.md` when convenient.
