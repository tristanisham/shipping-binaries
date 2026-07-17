import type { PropsWithChildren } from 'hono/jsx'
import { Footer } from './Footer.js'
import { Nav } from './Nav.js'

type PageProps = PropsWithChildren<{
  title: string
}>

export function Page({ title, children }: PageProps) {
  return (
    <html lang='en'>
      <head>
        <meta charset='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <title>{title} | Shipping Binaries</title>
        <link rel='stylesheet' href='/src/styles.css' />
      </head>
      <body>
        <Nav />
        <main class='container mx-auto'>
          <header>
            <h1>{title}</h1>
          </header>
          <div>{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  )
}
