import type { FC } from "hono/jsx";
import { Textarea } from "../ui/Textarea.js";

type MarkdownEditorProps = {
  name: string;
  value?: string;
  placeholder?: string;
};

const iconClass = "size-4 fill-none stroke-current";
const commonSvgProps = {
  "aria-hidden": "true",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "stroke-width": 2,
  viewBox: "0 0 24 24",
} as const;

const toolbarButtonClass =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-burgundy-700 transition-colors hover:bg-burgundy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chocolate-500/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-burgundy-300 dark:hover:bg-burgundy-900/60";

const markdownEditorScript = `
(() => {
  const roots = document.querySelectorAll("[data-md-editor]:not([data-md-editor-ready])");

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderInline = (value) =>
    escapeHtml(value)
      .replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s\`]+)\\)/g, '<a href="$2" class="underline" rel="noreferrer">$1</a>')
      .replace(/\`([^\`]+)\`/g, '<code class="rounded bg-onyx-500/15 px-1 py-0.5 text-[0.9em]">$1</code>')
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\\*([^*\\n]+)\\*/g, "$1<em>$2</em>")
      .replace(/_([^_\\n]+)_/g, "<em>$1</em>");

  const renderMarkdown = (source) => {
    const lines = source.replace(/\\r\\n/g, "\\n").split("\\n");
    const html = [];
    let paragraph = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      html.push("<p>" + paragraph.map(renderInline).join("<br>") + "</p>");
      paragraph = [];
    };

    for (const line of lines) {
      const heading = line.match(/^(#{1,6})\\s+(.*)$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        html.push("<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">");
        continue;
      }
      if (line.trim() === "") {
        flushParagraph();
        continue;
      }
      paragraph.push(line);
    }
    flushParagraph();

    return html.join("") || '<p class="opacity-60">Nothing to preview yet.</p>';
  };

  roots.forEach((root) => {
    root.dataset.mdEditorReady = "true";

    const textarea = root.querySelector("[data-md-input]");
    const preview = root.querySelector("[data-md-preview]");
    const previewToggle = root.querySelector("[data-md-preview-toggle]");
    const eyeOpen = previewToggle ? previewToggle.querySelector("[data-md-eye-open]") : null;
    const eyeClosed = previewToggle ? previewToggle.querySelector("[data-md-eye-closed]") : null;
    if (!textarea || !preview || !previewToggle) return;

    const wrap = (before, after) => {
      const { selectionStart, selectionEnd, value } = textarea;
      const selected = value.slice(selectionStart, selectionEnd);
      const next =
        value.slice(0, selectionStart) +
        before +
        selected +
        after +
        value.slice(selectionEnd);
      textarea.value = next;
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(selectionStart + before.length, selectionEnd + before.length);
      } else {
        const caret = selectionStart + before.length;
        textarea.setSelectionRange(caret, caret);
      }
    };

    root.querySelectorAll("[data-md-wrap]").forEach((button) => {
      button.addEventListener("click", () => {
        const marker = button.dataset.mdWrap;
        wrap(marker, marker);
      });
    });

    let previewing = false;
    previewToggle.addEventListener("click", () => {
      previewing = !previewing;
      if (previewing) {
        preview.innerHTML = renderMarkdown(textarea.value);
        preview.style.minHeight = textarea.offsetHeight + "px";
      }
      textarea.hidden = previewing;
      preview.hidden = !previewing;
      previewToggle.setAttribute("aria-pressed", String(previewing));
      previewToggle.setAttribute(
        "aria-label",
        previewing ? "Edit markdown" : "Preview markdown",
      );
      if (eyeOpen) eyeOpen.hidden = previewing;
      if (eyeClosed) eyeClosed.hidden = !previewing;
    });
  });
})();
`;

export const MarkdownEditor: FC<MarkdownEditorProps> = ({
  name,
  value,
  placeholder,
}) => (
  <div class="flex grow flex-col" data-md-editor>
    <div
      aria-label="Formatting"
      class="flex items-center gap-1 rounded-t-md border border-b-0 border-onyx-300 bg-amber-50/70 px-2 py-1 dark:border-onyx-700 dark:bg-onyx-950/60"
      role="toolbar"
    >
      <button
        aria-label="Bold"
        class={toolbarButtonClass}
        data-md-wrap="**"
        title="Bold"
        type="button"
      >
        <svg class={iconClass} {...commonSvgProps}>
          <path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />
        </svg>
      </button>
      <button
        aria-label="Italic"
        class={toolbarButtonClass}
        data-md-wrap="_"
        title="Italic"
        type="button"
      >
        <svg class={iconClass} {...commonSvgProps}>
          <line x1="19" x2="10" y1="4" y2="4" />
          <line x1="14" x2="5" y1="20" y2="20" />
          <line x1="15" x2="9" y1="4" y2="20" />
        </svg>
      </button>
      <button
        aria-label="Strikethrough"
        class={toolbarButtonClass}
        data-md-wrap="~~"
        title="Strikethrough"
        type="button"
      >
        <svg class={iconClass} {...commonSvgProps}>
          <path d="M16 4H9a3 3 0 0 0-2.83 4" />
          <path d="M14 12a4 4 0 0 1 0 8H6" />
          <line x1="4" x2="20" y1="12" y2="12" />
        </svg>
      </button>
      <div class="ml-auto">
        <button
          aria-label="Preview markdown"
          aria-pressed="false"
          class={toolbarButtonClass}
          data-md-preview-toggle
          title="Toggle preview"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps} data-md-eye-open>
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg class={iconClass} {...commonSvgProps} data-md-eye-closed hidden>
            <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
            <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
            <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
            <path d="m2 2 20 20" />
          </svg>
        </button>
      </div>
    </div>
    <Textarea
      class="min-h-80 grow resize-y rounded-t-none"
      data-md-input
      name={name}
      placeholder={placeholder}
    >
      {value ?? ""}
    </Textarea>
    <div
      class="min-h-80 max-w-none grow space-y-3 overflow-auto rounded-b-md border border-t-0 border-onyx-300 bg-amber-50/70 px-3 py-2 leading-relaxed dark:border-onyx-700 dark:bg-onyx-950/60"
      data-md-preview
      hidden
    />
    <script dangerouslySetInnerHTML={{ __html: markdownEditorScript }} />
  </div>
);
