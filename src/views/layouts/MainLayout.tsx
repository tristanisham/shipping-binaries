import type { Child, FC } from "hono/jsx";

export type LayoutMeta = {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  charset?: string;
  viewport?: string;
  robots?: string;
  canonical?: string;
};

type LayoutProps = {
  children?: Child;
  meta?: LayoutMeta;
};

export const Layout: FC<LayoutProps> = ({ children, meta }) => {
  return (
    <html>
      <head>
        {meta?.charset && <meta charset={meta.charset} />}
        {meta?.viewport && <meta name="viewport" content={meta.viewport} />}
        {meta?.title && <title>{meta.title}</title>}
        {meta?.description && (
          <meta name="description" content={meta.description} />
        )}
        {meta?.keywords && (
          <meta
            name="keywords"
            content={`${meta.keywords}`}
          />
        )}
        {meta?.author && <meta name="author" content={meta.author} />}
        {meta?.robots && <meta name="robots" content={meta.robots} />}
        {meta?.canonical && <link rel="canonical" href={meta.canonical} />}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try { const theme = localStorage.getItem("theme"); const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", theme === "dark" || (!theme && prefersDark)); } catch {}',
          }}
        />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body class="bg-amber-50 text-mist-600 dark:bg-mist-600 dark:text-amber-50">
        {children}
      </body>
    </html>
  );
};
