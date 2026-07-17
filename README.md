# Shipping Binaries

A [Hono](https://hono.dev/) life blog for Vercel — mostly-static, server-rendered
TSX with hydrated client islands, styled with Tailwind CSS v4.

## Development

```sh
npm install
npm run dev
```

Open <http://localhost:3000>.

`npm run dev` watches the Tailwind CSS and the client island bundle and runs the
server with auto-reload.

## Build

```sh
npm run build   # writes public/static/{app.css,client.js}
```

## Verification

```sh
npm run typecheck
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture, conventions, and the hydration
pattern.
