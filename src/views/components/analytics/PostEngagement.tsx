import type { FC } from "hono/jsx";

type PostEngagementProps = {
  isAuthenticated: boolean;
  postId: number;
  postSlug: string;
  postTitle: string;
};

const postEngagementScript = `
(() => {
  const script = document.currentScript;
  const root = script?.closest("[data-post-analytics]");
  const content = root?.querySelector("[data-post-content]");
  if (!(script instanceof HTMLScriptElement) ||
      !(root instanceof HTMLElement) ||
      !(content instanceof HTMLElement)) return;

  const post = {
    is_authenticated: script.dataset.isAuthenticated === "true",
    post_id: Number(script.dataset.postId),
    post_slug: script.dataset.postSlug,
    post_title: script.dataset.postTitle,
  };
  const startedAt = performance.now();
  const captured = new Set();
  let completionReached = false;
  let timer;

  const capture = (event, properties = {}) => {
    window.posthog?.capture(event, { ...post, ...properties });
  };

  capture("post viewed");

  const evaluateProgress = () => {
    const contentTop = content.getBoundingClientRect().top + window.scrollY;
    const contentHeight = Math.max(content.offsetHeight, 1);
    const viewportBottom = window.scrollY + window.innerHeight;
    const progress = Math.max(
      0,
      Math.min(100, ((viewportBottom - contentTop) / contentHeight) * 100),
    );
    const elapsedSeconds = Math.round((performance.now() - startedAt) / 1000);

    for (const percent of [25, 50, 75, 100]) {
      if (progress < percent || captured.has(percent)) continue;
      if (percent === 100 && elapsedSeconds < 5) {
        completionReached = true;
        continue;
      }
      captured.add(percent);
      capture("post read progress", {
        content_height: contentHeight,
        elapsed_seconds: elapsedSeconds,
        percent,
      });
    }

    if (completionReached && elapsedSeconds >= 5 && !captured.has(100)) {
      captured.add(100);
      capture("post read progress", {
        content_height: contentHeight,
        elapsed_seconds: elapsedSeconds,
        percent: 100,
      });
    }

    if (captured.has(100) && timer) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  window.addEventListener("scroll", evaluateProgress, { passive: true });
  window.addEventListener("resize", evaluateProgress);
  timer = window.setInterval(evaluateProgress, 1000);
  evaluateProgress();

  content.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;

    try {
      const url = new URL(link.href, window.location.href);
      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) {
        return;
      }
      capture("outbound link clicked", {
        link_domain: url.hostname,
        link_path: url.pathname,
        link_text: (link.textContent || "").trim().slice(0, 100),
      });
    } catch {
      // Ignore malformed author-provided links; analytics must never block them.
    }
  });
})();
`;

export const PostEngagement: FC<PostEngagementProps> = ({
  isAuthenticated,
  postId,
  postSlug,
  postTitle,
}) => (
  <script
    data-is-authenticated={isAuthenticated ? "true" : "false"}
    data-post-id={String(postId)}
    data-post-slug={postSlug}
    data-post-title={postTitle}
    dangerouslySetInnerHTML={{ __html: postEngagementScript }}
  />
);
