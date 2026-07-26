import type { Child, FC } from "hono/jsx";
import { PostHogSnippet } from "../components/analytics/PostHog.js";
import { PostFontScaleScript } from "../components/blog/PostFontScale.js";
import { type SocialMeta, SocialMetaTags } from "../components/SocialMeta.js";
import { ToastViewport } from "../components/Toast.js";

export type LayoutMeta = {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  charset?: string;
  viewport?: string;
  robots?: string;
  canonical?: string;
  // Feeds this page offers, rendered as <link rel="alternate"> so readers and
  // browser extensions can discover them. `type` is the feed's content type
  // (see FEED_CONTENT_TYPES), which is how a reader tells the formats apart.
  feeds?: { href: string; title: string; type: string }[];
  // Open Graph / Twitter card tags; title, description, and url fall back to
  // the page's title, description, and canonical when not set.
  social?: SocialMeta;
  // Load Alpine.js — only needed on pages with interactive `x-*` directives.
  alpine?: boolean;
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
        {meta?.feeds?.map((feed) => (
          <link
            rel="alternate"
            type={feed.type}
            title={feed.title}
            href={feed.href}
          />
        ))}
        {meta?.social && (
          <SocialMetaTags
            social={{
              title: meta.title,
              description: meta.description,
              url: meta.canonical,
              ...meta.social,
            }}
          />
        )}
        <link rel="icon" type="image/png" href="/favicon.png" />
        {
          /* Preload above-the-fold fonts so the download starts before styles.css
            is parsed, shrinking the font-display: swap flash. crossorigin is
            required even same-origin: fonts fetch in anonymous-CORS mode. */
        }
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossorigin=""
          href="/fonts/Noto_Sans/NotoSans-VariableFont_wdth,wght.woff2"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          crossorigin=""
          href="/fonts/Black_Ops_One/BlackOpsOne-Regular.woff2"
        />
        {meta?.alpine && (
          <script
            defer
            src="https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js"
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try { const theme = localStorage.getItem("theme"); const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches; document.documentElement.classList.toggle("dark", theme === "dark" || (!theme && prefersDark)); const scale = Number(localStorage.getItem("postFontScale")); if (Number.isFinite(scale) && scale > 0) { document.documentElement.style.setProperty("--post-font-scale", String(Math.min(1.5, Math.max(0.875, scale)))); } } catch {}',
          }}
        />
        <link rel="stylesheet" href="/styles.css" />
        <PostHogSnippet />
      </head>
      <body class="bg-amber-50 font-sans text-mist-600 dark:bg-mist-600 dark:text-amber-50">
        {children}
        <ToastViewport />
        <PostFontScaleScript />
      </body>
    </html>
  );
};
