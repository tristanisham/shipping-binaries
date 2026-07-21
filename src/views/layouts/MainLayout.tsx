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

// Runs before first paint so a saved theme doesn't flash, then wires the
// header's #theme-toggle via delegation since the button renders later.
const themeScript = `
(function () {
  var saved = localStorage.getItem("theme");
  if (saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#theme-toggle")) return;
    var dark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  });
})();
`;

export const Layout: FC<LayoutProps> = ({ children, meta }) => {
  return (
    <html>
      <head>
        {meta?.charset && <meta charset={meta.charset} />}
        <meta
          name="viewport"
          content={meta?.viewport ?? "width=device-width, initial-scale=1"}
        />
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
        <link rel="stylesheet" href="/styles.css" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body class={'bg-amber-50 dark:bg-mist-600 dark:text-amber-50'}>
        {children}
      </body>
    </html>
  );
};
