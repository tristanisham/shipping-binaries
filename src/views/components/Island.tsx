import type { Child } from 'hono/jsx'

type IslandProps = {
  // Must match a key in the client registry (src/client/index.tsx).
  name: string
  // Serialised into the DOM and re-parsed on the client for hydration.
  props?: Record<string, unknown>
  // Server-rendered markup shown before the island hydrates.
  children?: Child
}

// Marks a subtree for client-side hydration. The server renders `children`
// as static HTML; the client bundle finds the marker and mounts the
// interactive component in its place.
export function Island({ name, props, children }: IslandProps) {
  return (
    <div data-island={name} data-props={props ? JSON.stringify(props) : undefined}>
      {children}
    </div>
  )
}
