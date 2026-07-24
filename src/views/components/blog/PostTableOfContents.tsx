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
    const container = root.querySelector("[data-toc-container]");
    const panel = root.querySelector("[data-toc-panel]");
    const links = Array.from(root.querySelectorAll("[data-toc-link]"));
    if (
      !(button instanceof HTMLButtonElement) ||
      !(container instanceof HTMLElement) ||
      !(panel instanceof HTMLElement)
    ) return;

    root.dataset.ready = "true";

    const setExpanded = (expanded) => {
      container.classList.toggle("invisible", !expanded);
      container.classList.toggle("pointer-events-none", !expanded);
      container.classList.toggle("opacity-0", !expanded);
      button.setAttribute("aria-expanded", expanded.toString());
      button.setAttribute("aria-label", expanded ? "Hide contents" : "Show contents");
      button.setAttribute("title", expanded ? "Hide contents" : "Show contents");
    };

    button.addEventListener("click", () => {
      setExpanded(button.getAttribute("aria-expanded") !== "true");
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Node && !root.contains(target)) {
        setExpanded(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setExpanded(false);
        button.focus();
      }
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
        link.classList.toggle("opacity-50", !current);
        link.classList.toggle("opacity-100", current);
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
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href?.startsWith("#")) return;
        const section = document.getElementById(href.slice(1));
        if (!section) return;

        event.preventDefault();
        history.pushState(null, "", href);
        setCurrent(link);
        section.scrollIntoView({ behavior: "smooth", block: "start" });

        const dark = document.documentElement.classList.contains("dark");
        section.animate(
          [
            {
              backgroundColor: dark
                ? "var(--color-chocolate-800)"
                : "var(--color-chocolate-100)",
            },
            { backgroundColor: "transparent" },
          ],
          { duration: 3000, easing: "ease-out" },
        );
      });
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

  const markerStep = headings.length > 1
    ? Math.min(6, 100 / (headings.length - 1))
    : 0;
  const markerStart = 56 - markerStep * (headings.length - 1) / 2;

  return (
    <>
      <aside
        class="fixed left-2 top-1/2 z-30 hidden -translate-y-1/2 items-center xl:flex"
        id="post-table-of-contents"
      >
        <button
          aria-controls="post-contents-panel"
          aria-expanded="false"
          aria-label="Show contents"
          class="flex cursor-pointer items-center justify-center rounded-md border border-mist-600/20 bg-amber-50/95 px-1 py-2 text-mist-600 shadow-sm transition-colors hover:border-mist-600 hover:bg-mist-600 hover:text-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-600 dark:border-amber-50/20 dark:bg-mist-600/95 dark:text-amber-50 dark:hover:border-amber-50 dark:hover:bg-amber-50 dark:hover:text-mist-600 dark:focus-visible:outline-amber-50"
          data-toc-toggle
          title="Show contents"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="h-28 w-3 fill-none"
            stroke-linecap="round"
            stroke-width="1.5"
            viewBox="0 0 12 112"
          >
            {headings.map((heading, index) => {
              const y = markerStart + markerStep * index;
              return (
                <line
                  class={heading.level === 2
                    ? "stroke-current"
                    : "stroke-current opacity-40"}
                  x1="3"
                  x2="9"
                  y1={y}
                  y2={y}
                />
              );
            })}
          </svg>
        </button>
        <div
          class="invisible pointer-events-none ml-2 opacity-0 transition-opacity duration-200"
          data-toc-container
        >
          <nav
            aria-labelledby="post-contents-heading"
            class="max-h-[70vh] w-56 overflow-y-auto rounded-lg border border-mist-600/20 bg-amber-50 p-3 text-mist-600 shadow-lg dark:border-amber-50/20 dark:bg-mist-600 dark:text-amber-50"
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
                  class={heading.level === 2
                    ? "pl-2 font-normal"
                    : heading.level === 3
                    ? "pl-4 font-normal"
                    : heading.level === 4
                    ? "pl-6 font-normal"
                    : "pl-2 font-normal"}
                >
                  <a
                    class="block truncate rounded-sm opacity-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-600 dark:focus-visible:outline-amber-50"
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
        </div>
      </aside>
      <script dangerouslySetInnerHTML={{ __html: tableOfContentsScript }} />
    </>
  );
};
