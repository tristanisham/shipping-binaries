import type { FC } from 'hono/jsx'
import { render } from 'hono/jsx/dom'
import { Counter } from '../views/components/Counter.js'

// Registry of components that can hydrate on the client. Keys must match the
// `name` passed to <Island /> on the server. Props are deserialised from the
// DOM, so components are stored under a permissive prop type here.
const registry: Record<string, FC<any>> = {
  Counter
}

// Module scripts are deferred, so the DOM is ready when this runs.
for (const el of document.querySelectorAll<HTMLElement>('[data-island]')) {
  const name = el.dataset.island
  if (!name) continue
  const Component = registry[name]
  if (!Component) continue
  const props = el.dataset.props ? JSON.parse(el.dataset.props) : {}
  render(<Component {...props} />, el)
}
