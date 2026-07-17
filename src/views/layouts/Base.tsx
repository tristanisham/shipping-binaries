import { Fragment } from 'hono/jsx'
import type { PropsWithChildren } from 'hono/jsx'
import { html } from 'hono/html'
import { Header } from '../components/Header.js'
import { Content } from '../components/Content.js'
import { Footer } from '../components/Footer.js'

type BaseProps = PropsWithChildren<{
  title: string
  currentPath: string
  description?: string
  keywords?: string[]
}>

// The HTML shell shared by every page: <head> assets plus the
// Header / Content / Footer structure.
export function Base({ title, currentPath, description, keywords, children }: BaseProps) {
  return (
    <Fragment>
      {html`<!doctype html>`}
      <html lang='en'>
        <head>
          <meta charset='utf-8' />
          <meta name='viewport' content='width=device-width, initial-scale=1' />
          <title>{title} | Shipping Binaries</title>
          {description ? <meta name='description' content={description} /> : null}
          {keywords && keywords.length > 0 ? (
            <meta name='keywords' content={keywords.join(', ')} />
          ) : null}
          <link rel='stylesheet' href='/static/app.css' />
          <script type='module' src='/static/client.js'></script>
        </head>
        <body class='text-gray-900'>
          <Header currentPath={currentPath} />
          <Content>{children}</Content>
          <Footer />
        </body>
      </html>
    </Fragment>
  )
}
