import type { FC } from "hono/jsx";

export const SITE_ORIGIN = "https://shippingbinaries.com";
export const SITE_NAME = "Shipping Binaries";

// Social crawlers require absolute URLs for og:url / og:image.
export const toAbsoluteUrl = (pathOrUrl: string): string =>
  new URL(pathOrUrl, SITE_ORIGIN).toString();

export type SocialMeta = {
  title?: string;
  description?: string;
  // Absolute URL of the page (use toAbsoluteUrl).
  url?: string;
  // Absolute URL of the preview image (use toAbsoluteUrl).
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  siteName?: string;
  // Author name (article:author).
  author?: string;
  // ISO 8601 timestamps (use toIsoTimestamp).
  publishedTime?: string;
  modifiedTime?: string;
  twitterCard?: "summary" | "summary_large_image";
  // Site/author Twitter handles, including the "@".
  twitterSite?: string;
  twitterCreator?: string;
};

// Open Graph (Facebook, iMessage, Slack, Discord, ...) + Twitter card tags.
export const SocialMetaTags: FC<{ social: SocialMeta }> = ({ social }) => {
  const type = social.type ?? "website";
  const twitterCard = social.twitterCard ??
    (social.image ? "summary_large_image" : "summary");
  const isArticle = type === "article";

  return (
    <>
      {social.title && <meta property="og:title" content={social.title} />}
      {social.description && (
        <meta property="og:description" content={social.description} />
      )}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={social.siteName ?? SITE_NAME} />
      {social.url && <meta property="og:url" content={social.url} />}
      {social.image && <meta property="og:image" content={social.image} />}
      {social.imageAlt && (
        <meta property="og:image:alt" content={social.imageAlt} />
      )}
      {isArticle && social.author && (
        <meta property="article:author" content={social.author} />
      )}
      {isArticle && social.publishedTime && (
        <meta property="article:published_time" content={social.publishedTime} />
      )}
      {isArticle && social.modifiedTime && (
        <meta property="article:modified_time" content={social.modifiedTime} />
      )}
      <meta name="twitter:card" content={twitterCard} />
      {social.title && <meta name="twitter:title" content={social.title} />}
      {social.description && (
        <meta name="twitter:description" content={social.description} />
      )}
      {social.image && <meta name="twitter:image" content={social.image} />}
      {social.imageAlt && (
        <meta name="twitter:image:alt" content={social.imageAlt} />
      )}
      {social.twitterSite && (
        <meta name="twitter:site" content={social.twitterSite} />
      )}
      {social.twitterCreator && (
        <meta name="twitter:creator" content={social.twitterCreator} />
      )}
    </>
  );
};
