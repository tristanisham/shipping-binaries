import type { FC } from "hono/jsx";

// Progressive enhancement: the byline is allowed to truncate, and while it is
// truncating we drop pieces of the row in data-drop-order — the redundant
// "Published" first, then Read, Share, and Comments. The text-size controls
// carry no drop order, so they are never removed. With JS off nothing is
// dropped and the byline simply truncates, which is the same graceful end state
// as dropping everything.
const postActionsFitScript = `
(() => {
  const fit = (row) => {
    const byline = row.querySelector("[data-post-byline]");
    const bar = row.querySelector("[data-post-actions]");
    if (!byline || !bar) return;

    // Scoped to the row, not the bar: the byline's "Published" is rung 0.
    const droppable = Array.from(row.querySelectorAll("[data-drop-order]"))
      .sort((a, b) => Number(a.dataset.dropOrder) - Number(b.dataset.dropOrder));

    for (const el of droppable) el.style.removeProperty("display");
    for (const el of droppable) {
      // One pixel of slack: sub-pixel text metrics otherwise read as overflow.
      if (byline.scrollWidth <= byline.clientWidth + 1) break;
      el.style.setProperty("display", "none", "important");
    }
  };

  let running = false;
  const fitAll = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(() => {
      document.querySelectorAll("[data-post-meta]").forEach(fit);
      running = false;
    });
  };

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(fitAll);
    document.querySelectorAll("[data-post-meta]").forEach((row) => observer.observe(row));
  } else {
    window.addEventListener("resize", fitAll);
  }

  // The byline's width depends on the webfont and on the reader's text size.
  window.addEventListener("postfontsizechange", fitAll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  fitAll();
})();
`;

export const PostActionsFitScript: FC = () => (
  <script dangerouslySetInnerHTML={{ __html: postActionsFitScript }} />
);
