import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Local imports use the `.js` extension (ESM convention) even though the
// source files are `.ts`/`.tsx`. esbuild does not rewrite those by default,
// so this plugin resolves `./foo.js` to the real `./foo.tsx`/`./foo.ts`.
const jsToTs = {
  name: 'js-to-ts',
  setup(build) {
    build.onResolve({ filter: /^\.{1,2}\/.*\.js$/ }, (args) => {
      const base = resolve(args.resolveDir, args.path.replace(/\.js$/, ''))
      for (const ext of ['.tsx', '.ts']) {
        if (existsSync(base + ext)) return { path: base + ext }
      }
      return undefined
    })
  }
}

// Client bundle: server-rendered islands are re-rendered in the browser via
// hono/jsx/dom, so the client build uses the DOM-optimised JSX runtime.
export function clientOptions({ minify }) {
  return {
    entryPoints: ['src/client/index.tsx'],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    outfile: 'public/static/client.js',
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx/dom',
    minify,
    sourcemap: !minify,
    plugins: [jsToTs],
    logLevel: 'info'
  }
}
