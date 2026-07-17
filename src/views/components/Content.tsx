import type { PropsWithChildren } from 'hono/jsx'

// Reusable main-content wrapper shared by every landing page.
export function Content({ children }: PropsWithChildren) {
  return <main class='container mx-auto px-4 py-8'>{children}</main>
}
