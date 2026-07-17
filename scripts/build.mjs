import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import esbuild from 'esbuild'
import { clientOptions } from './esbuild.shared.mjs'

mkdirSync('public/static', { recursive: true })

// Tailwind stylesheet.
execFileSync(
  'npx',
  ['@tailwindcss/cli', '-i', 'src/styles/app.css', '-o', 'public/static/app.css', '--minify'],
  { stdio: 'inherit' }
)

// Client island bundle.
await esbuild.build(clientOptions({ minify: true }))

console.log('Build complete: public/static/{app.css,client.js}')
