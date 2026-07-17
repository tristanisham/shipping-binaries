import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import esbuild from 'esbuild'
import { clientOptions } from './esbuild.shared.mjs'

mkdirSync('public/static', { recursive: true })

const children = []

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit' })
  children.push(child)
  return child
}

// Rebuild the client bundle on change.
const ctx = await esbuild.context(clientOptions({ minify: false }))
await ctx.watch()

// Rebuild Tailwind CSS on change.
run('npx', ['@tailwindcss/cli', '-i', 'src/styles/app.css', '-o', 'public/static/app.css', '--watch'])

// Serve the app with auto-reload (tsx handles TS + JSX).
run('npx', ['tsx', 'watch', 'src/dev.ts'])

function shutdown() {
  for (const child of children) child.kill('SIGTERM')
  ctx.dispose()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
