# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Overview

**Shipping Binaries** (`shippingbinaries.com`) is a [Hono](https://hono.dev/)
life blog deployed on Vercel. It is **mostly-static, server-rendered TSX** with
**hydrated client islands** for the interactive bits (demos, illustrations,
graphs). Styling is Tailwind CSS v4.

Keep the codebase small and consistent with the conventions below.

## Tech Stack

- **Runtime:** Node.js `>=22.6`. Local dev runs through [`tsx`](https://tsx.is/)
  because Node's native TypeScript support strips types but **cannot transform
  JSX** — a JSX-capable runner is required.
- **Framework:** Hono `^4` (`hono`), using `hono/jsx` for server rendering and
  `hono/jsx/dom` for client hydration.
- **Local server:** `@hono/node-server` (+ `serve-static` for built assets).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/cli` (no PostCSS config).
- **Client bundler:** `esbuild` (bundles island entry → `public/static/client.js`).
- **Content:** Markdown in `content/`, rendered with `marked`.
- **Language:** TypeScript `^6`, strict mode, ES modules.
- **Deployment:** Vercel (`framework: hono`), with a `buildCommand` that
  produces the static assets.

There is **no test framework** and **no lint script**. `npm run typecheck` is
the verification gate.

## Project Structure

```
.
├── content/
│   └── posts/                  # Markdown blog posts (frontmatter + body)
├── public/
│   └── static/                 # GENERATED build output (gitignored)
│       ├── app.css             #   Tailwind output
│       └── client.js           #   esbuild island bundle
├── scripts/
│   ├── build.mjs               # one-shot build (CSS + client bundle)
│   ├── dev.mjs                 # dev: watch CSS, watch client, run tsx server
│   └── esbuild.shared.mjs      # shared esbuild config + .js→.ts resolver
├── src/
│   ├── index.ts                # Hono app: mounts routers, exports app (Vercel entry)
│   ├── dev.ts                  # local entry: serves app + /static via node-server
│   ├── client/
│   │   └── index.tsx           # client hydration entry (island registry)
│   ├── routers/                # route logic ONLY (.ts, no JSX)
│   │   ├── home.ts             #   /  and  /about
│   │   └── blog.ts             #   /blog  and  /blog/:slug  (+ content loader)
│   ├── styles/
│   │   └── app.css             # Tailwind entry (@import "tailwindcss")
│   └── views/                  # everything render-related (TSX)
│       ├── layouts/
│       │   └── Base.tsx        #   HTML shell: <head> + Header/Content/Footer
│       ├── components/
│       │   ├── Header.tsx      #   contains <Nav> at the top
│       │   ├── Nav.tsx         #   active-link nav
│       │   ├── Content.tsx     #   reusable <main> wrapper for landing pages
│       │   ├── Footer.tsx
│       │   ├── Island.tsx      #   hydration marker (<div data-island …>)
│       │   └── Counter.tsx     #   example hydrated island
│       ├── Home.tsx            #   generic views live at the root of views/
│       ├── About.tsx
│       ├── Blog.tsx
│       ├── Post.tsx
│       └── NotFound.tsx
├── package.json
├── tsconfig.json               # strict, noEmit, jsx: react-jsx, jsxImportSource: hono/jsx
├── vercel.json                 # framework: hono, buildCommand, includeFiles: content/**
└── README.md
```

### Architecture rules

- **`src/index.ts` is the base app and the Vercel function entry.** It only
  mounts routers and exports the Hono app as default. Keep it thin.
- **Routers (`src/routers/`) hold route logic and stay JSX-free (`.ts`).** A
  handler renders a page by *calling* a view function, e.g.
  `c.html(Home({ currentPath: c.req.path }))` — no JSX in router files.
- **Views (`src/views/`) hold everything render-related (`.tsx`):**
  - `layouts/` — page shells (currently `Base.tsx`).
  - `components/` — reusable components.
  - the **root of `views/`** — generic per-route views (`Home`, `Blog`, …).
- **`Content` is the shared `<main>`** wrapper used by every landing page (via
  `Base`). `Header`, `Content`, and `Footer` are each wrapped in
  `container mx-auto px-4` so pages have consistent side padding.
- **`Nav` lives at the top of `Header`.** Links are `text-red-600` with
  `hover:text-orange-600`; the active link also gets `underline` (and
  `aria-current="page"`). Active state is derived from `currentPath`, which the
  router passes down from `c.req.path`.

## Hydration (client islands)

The site is server-rendered. To make a component interactive in the browser:

1. Write/keep the component in `src/views/components/` using hooks from
   `hono/jsx` (e.g. `useState`) — see `Counter.tsx`. It must render statically
   on the server and interactively on the client.
2. Register it in the client registry in `src/client/index.tsx` under a name.
3. Render it on the server inside `<Island name="Counter" props={{…}}>` with the
   static markup as children. The server emits a `data-island` marker; the
   client bundle finds every marker, parses `data-props`, and mounts the
   interactive component with `render` from `hono/jsx/dom`.

The client bundle is compiled by esbuild with `jsxImportSource: hono/jsx/dom`
(the DOM-optimised runtime), while everything else typechecks/renders with
`hono/jsx`. Both are set up already — just follow the pattern above.

## Content

Blog posts are Markdown files in `content/posts/` with simple `---` frontmatter
(`title`, `date`, `description`). `src/routers/blog.ts` reads them at request
time (resolved from `process.cwd()`), parses frontmatter, and renders the body
with `marked`. `vercel.json` sets `includeFiles: "content/**"` so the files ship
with the serverless function.

## Commands

```sh
npm install       # install the locked dependency tree
npm run dev       # watch CSS + client bundle, run the tsx server on http://localhost:3000
npm run build     # one-shot: build public/static/{app.css,client.js}
npm start         # build once, then run the server (no watch)
npm run typecheck # strict type-check with tsc --noEmit (the verification gate)
```

Override the port with the `PORT` environment variable (defaults to `3000`).

## Conventions

- **TypeScript ES modules**, strict typing. Avoid `any` unless an external
  boundary makes it unavoidable (e.g. the deserialised-props island registry).
- **Style:** two-space indentation, single quotes, no semicolons. Match existing
  files exactly.
- **Naming:** `camelCase` for variables/functions, `PascalCase` for
  types/components, descriptive lowercase router filenames (e.g. `blog.ts`).
- **Imports** between local source files use the `.js` extension even for
  `.ts`/`.tsx` source (ESM convention). The esbuild client build resolves these
  back to `.ts`/`.tsx` via a small plugin in `scripts/esbuild.shared.mjs`.
- **JSX attributes** follow Hono (`class`, not `className`).
- Keep route handlers short; put rendering in views, not routers.
- Never commit credentials or `.env` files. `node_modules/`, `.vercel`, and the
  generated `public/static/` are gitignored.

## Verifying Changes

1. Run `npm run typecheck` — it must pass clean.
2. Run `npm run dev` and exercise the affected route(s) at
   `http://localhost:3000`. For islands, confirm the component actually reacts to
   interaction in the browser (not just that it renders).

If tests are introduced later, place them beside their modules as `*.test.ts`,
add a reproducible `npm test` script, and cover success, validation, and error
paths.

## Deployment (Vercel)

`vercel.json` uses the `hono` framework preset with `src/index.ts` as the
function entry. `buildCommand` runs `npm run build` to generate
`public/static/{app.css,client.js}`, which Vercel serves statically; all other
requests hit the Hono function. No Deno/Bun/Node-custom runtime is needed.

## Commit & PR Guidelines

- Use concise, imperative commit subjects (e.g. `Add health check route`). Keep
  each commit focused.
- PRs should explain the behavior change, list the verification commands run,
  link relevant issues, and include request/response examples for API changes.
- Do **not** open a pull request unless explicitly asked.
