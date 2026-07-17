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

### Weather widget (optional)

The header shows a clock and local weather. To enable live weather, copy
`.env.example` to `.env` and set `OPENWEATHER_API_KEY` (free "Current Weather
Data" plan). On Vercel, set it as a Project Environment Variable. Without a key
the clock and city picker still work; weather just reports as unavailable.

## Build

```sh
npm run build   # writes public/static/{app.css,client.js}
```

## Verification

```sh
npm run typecheck
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture, conventions, the frontmatter
fields, and the hydration pattern.
