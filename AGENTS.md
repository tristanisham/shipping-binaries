# Repository Guidelines

## Project Structure & Module Organization

This repository contains a small Hono application deployed through Vercel. Application source lives in `src/`; `src/index.tsx` creates the Hono instance, defines routes, and exports the app. TypeScript compiler settings are in `tsconfig.json`, with generated output directed to `dist/`. Dependency versions are recorded in `package.json` and `package-lock.json`. Keep generated files, local Vercel state, and dependencies out of source control as specified by `.gitignore`.

As the service grows, group related handlers under `src/routes/` and reusable logic under `src/lib/`. Keep static assets in a top-level `public/` directory if they are introduced.

## Build, Test, and Development Commands

- `npm install` installs the exact locked dependency tree.
- `npm run dev` starts the Vite development server with HMR at `http://localhost:3000`.
- `npx tsc --noEmit` type-checks the strict TypeScript project without writing `dist/` output.

## Coding Style & Naming Conventions

Use TypeScript ES modules and preserve the existing style: two-space indentation, single quotes, and no semicolons. Keep strict typing enabled and avoid `any` unless an external boundary makes it unavoidable. Use `camelCase` for variables and functions, `PascalCase` for types and classes, and descriptive lowercase route filenames such as `health.ts`. Use Tailwind utility classes for styling; global CSS belongs in `src/styles.css`. Keep route handlers short; extract shared or nontrivial behavior into named functions.

## Testing Guidelines

No automated test framework or coverage threshold is configured yet. For every change, run `npm run typecheck`, then exercise affected routes through `npm run dev`. If tests are added, place them beside their modules as `*.test.ts`, add a reproducible `npm test` script, and cover success responses plus validation and error paths.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout, so use concise, imperative commit subjects such as `Add health check route`. Keep each commit focused. Pull requests should explain the behavior change, list verification commands, link relevant issues, and include request/response examples for API changes. Add screenshots only when output has a visual component. Never commit credentials, `.env` files, or deployment tokens.
