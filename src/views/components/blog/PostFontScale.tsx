import type { FC } from "hono/jsx";

// Keep these in sync with the bootstrap clamp in views/layouts/MainLayout.tsx.
const postFontScaleScript = `
(() => {
  const MIN = 0.875;
  const MAX = 1.5;
  const STEP = 0.125;
  const clamp = (value) => Math.min(MAX, Math.max(MIN, value));

  const read = () => {
    try {
      const stored = Number(localStorage.getItem("postFontScale"));
      return Number.isFinite(stored) && stored > 0 ? clamp(stored) : 1;
    } catch {
      return 1;
    }
  };

  const apply = (value) => {
    document.documentElement.style.setProperty("--post-font-scale", String(value));
  };

  window.stepPostFontScale = (direction) => {
    const next = clamp(Math.round((read() + direction * STEP) * 1000) / 1000);
    apply(next);
    try {
      localStorage.setItem("postFontScale", String(next));
    } catch {}
  };

  apply(read());
})();
`;

export const PostFontScaleScript: FC = () => (
  <script dangerouslySetInnerHTML={{ __html: postFontScaleScript }} />
);
