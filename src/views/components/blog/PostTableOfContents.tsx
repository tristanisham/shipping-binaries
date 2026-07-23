import type { FC } from "hono/jsx";
import type { PostHeading } from "./PostBody.js";

type PostTableOfContentsProps = {
  headings: readonly PostHeading[];
};

const tableOfContentsScript = `
  (() => {
    const root = document.getElementById("post-table-of-contents");
    if (!root || root.dataset.ready === "true") return;

    const button = root.querySelector("[data-toc-toggle]");
    const panel = root.querySelector("[data-toc-panel]");
    const links = Array.from(root.querySelectorAll("[data-toc-link]"));
    if (!(button instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return;

    root.dataset.ready = "true";

    const setExpanded = (expanded) => {
      panel.classList.toggle("hidden", !expanded);
      button.setAttribute("aria-expanded", expanded.toString());
      button.setAttribute("aria-label", expanded ? "Hide contents" : "Show contents");
      button.setAttribute("title", expanded ? "Hide contents" : "Show contents");
    };

    button.addEventListener("click", () => {
      setExpanded(button.getAttribute("aria-expanded") !== "true");
    });

    const sections = links.flatMap((link) => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return [];
      const section = document.getElementById(href.slice(1));
      return section ? [{ link, section }] : [];
    });

    const setCurrent = (currentLink) => {
      for (const link of links) {
        const current = link === currentLink;
        link.classList.toggle("font-bold", current);
        link.classList.toggle("text-chocolate-500", current);
        if (current) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    };

    const updateCurrent = () => {
      let current = sections[0];
      for (const section of sections) {
        if (section.section.getBoundingClientRect().top <= 160) {
          current = section;
        } else {
          break;
        }
      }
      if (current) setCurrent(current.link);
    };

    let framePending = false;
    const scheduleUpdate = () => {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(() => {
        updateCurrent();
        framePending = false;
      });
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    for (const link of links) {
      link.addEventListener("click", () => setCurrent(link));
    }
    updateCurrent();
  })();
`;

export const PostTableOfContents: FC<PostTableOfContentsProps> = ({
  headings,
}) => {
  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      <aside
        class="fixed left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center xl:flex"
        id="post-table-of-contents"
      >
        <button
          aria-controls="post-contents-panel"
          aria-expanded="true"
          aria-label="Hide contents"
          class="flex cursor-pointer items-center justify-center rounded-md border border-mist-600/20 bg-amber-50/95 px-1 py-2 text-mist-600 shadow-sm transition-colors hover:border-chocolate-500 hover:text-chocolate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chocolate-500 dark:border-amber-50/20 dark:bg-mist-600/95 dark:text-amber-50"
          data-toc-toggle
          title="Hide contents"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="h-28 w-3 fill-none stroke-current"
            stroke-linecap="round"
            stroke-width="1.5"
            viewBox="0 0 12 112"
          >
            <path d="M3 6h6M3 16h6M3 26h6M3 36h6M3 46h6M3 56h6M3 66h6M3 76h6M3 86h6M3 96h6M3 106h6" />
          </svg>
        </button>
        <nav
          aria-labelledby="post-contents-heading"
          class="ml-2 max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-mist-600/20 bg-amber-50 p-3 text-mist-600 shadow-lg dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50"
          data-toc-panel
          id="post-contents-panel"
        >
          <h2
            class="mb-2 text-xs font-bold uppercase tracking-wide opacity-70"
            id="post-contents-heading"
          >
            Contents
          </h2>
          <ol class="space-y-1.5 text-sm">
            {headings.map((heading) => (
              <li
                class={heading.level === 3
                  ? "pl-3"
                  : heading.level === 4
                  ? "pl-6"
                  : undefined}
              >
                <a
                  class="block truncate rounded-sm hover:text-chocolate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chocolate-500"
                  data-toc-link
                  href={`#${heading.id}`}
                  title={heading.label}
                >
                  {heading.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <script dangerouslySetInnerHTML={{ __html: tableOfContentsScript }} />
    </>
  );
};
