import type { FC } from "hono/jsx";

// The ladder is the CSS absolute-size keywords, so every step is resolved by
// the browser against the reader's own font-size preference rather than against
// a hardcoded pixel base — "medium" *is* whatever they configured. Keep this
// list in sync with the bootstrap in views/layouts/MainLayout.tsx.
export const POST_FONT_SIZES = [
  "x-small",
  "small",
  "medium",
  "large",
  "x-large",
  "xx-large",
] as const;

export const POST_FONT_SIZE_DEFAULT = "medium";

const postFontScaleScript = `
(() => {
  const SIZES = ${JSON.stringify(POST_FONT_SIZES)};
  const DEFAULT_INDEX = SIZES.indexOf("${POST_FONT_SIZE_DEFAULT}");

  const readIndex = () => {
    try {
      const stored = SIZES.indexOf(localStorage.getItem("postFontSize"));
      return stored === -1 ? DEFAULT_INDEX : stored;
    } catch {
      return DEFAULT_INDEX;
    }
  };

  const apply = (index) => {
    document.documentElement.style.setProperty("--post-font-size", SIZES[index]);
  };

  window.stepPostFontScale = (direction) => {
    const next = Math.min(SIZES.length - 1, Math.max(0, readIndex() + direction));
    apply(next);
    try {
      localStorage.setItem("postFontSize", SIZES[next]);
    } catch {}
    window.dispatchEvent(new Event("postfontsizechange"));
  };

  apply(readIndex());
})();
`;

export const PostFontScaleScript: FC = () => (
  <script dangerouslySetInnerHTML={{ __html: postFontScaleScript }} />
);
