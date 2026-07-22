import type { FC } from "hono/jsx";
import { Button } from "../ui/Button.js";
import { Textarea } from "../ui/Textarea.js";
import { panelField, panelOutlineButton, panelSurface } from "./panel.js";

type EditorJsProps = {
  name: string;
  value?: string;
  placeholder?: string;
};

type EditorData = {
  blocks: unknown[];
  time?: number;
  version?: string;
};

const parseEditorData = (value: string): EditorData | null => {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "blocks" in parsed &&
      Array.isArray(parsed.blocks)
    ) {
      return parsed as EditorData;
    }
  } catch {
    // Existing posts contain plain text rather than Editor.js output.
  }

  return null;
};

const escapeLegacyText = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\r?\n/g, "<br>");

export const normalizeEditorData = (value = ""): EditorData => {
  const parsed = parseEditorData(value);
  if (parsed) {
    return parsed;
  }

  return {
    blocks: value.length > 0
      ? [{ type: "paragraph", data: { text: escapeLegacyText(value) } }]
      : [],
  };
};

const iconClass = "size-4 fill-none stroke-current";
const commonSvgProps = {
  "aria-hidden": "true",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "stroke-width": 2,
  viewBox: "0 0 24 24",
} as const;

const editorToolButtonClass =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-amber-50 transition-colors hover:bg-amber-50/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-50/40 disabled:cursor-not-allowed disabled:opacity-40 dark:text-mist-600 dark:hover:bg-mist-600/10 dark:focus-visible:ring-mist-600/40";

const editorJsScript = `
(() => {
  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const backtick = String.fromCharCode(96);
  const inlineCodePattern = new RegExp(
    backtick + "([^" + backtick + "]+)" + backtick,
    "g",
  );
  const codeFence = backtick.repeat(3);

  const markdownInline = (value) =>
    escapeHtml(value)
      .replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s]+)\\)/g, '<a href="$2">$1</a>')
      .replace(/\\*\\*([^*]+)\\*\\*/g, "<b>$1</b>")
      .replace(/__([^_]+)__/g, "<b>$1</b>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\\*([^*\\n]+)\\*/g, "$1<i>$2</i>")
      .replace(/(^|[^_])_([^_\\n]+)_/g, "$1<i>$2</i>")
      .replace(inlineCodePattern, "<code>$1</code>");

  const markdownToBlocks = (markdown) => {
    const lines = markdown.replace(/\\r\\n/g, "\\n").split("\\n");
    const blocks = [];
    let paragraph = [];
    let code = [];
    let inCode = false;

    const flushParagraph = () => {
      if (paragraph.length === 0) return;
      blocks.push({
        type: "paragraph",
        data: { text: paragraph.map(markdownInline).join("<br>") },
      });
      paragraph = [];
    };

    const flushCode = () => {
      blocks.push({ type: "code", data: { code: code.join("\\n") } });
      code = [];
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (line.trimStart().startsWith(codeFence)) {
        if (inCode) flushCode();
        else flushParagraph();
        inCode = !inCode;
        continue;
      }

      if (inCode) {
        code.push(line);
        continue;
      }

      const heading = line.match(/^(#{1,6})\\s+(.+)$/);
      if (heading) {
        flushParagraph();
        blocks.push({
          type: "header",
          data: {
            level: Math.min(4, Math.max(2, heading[1].length)),
            text: markdownInline(heading[2]),
          },
        });
        continue;
      }

      if (/^\\s*>\\s?/.test(line)) {
        flushParagraph();
        const quote = [];
        while (index < lines.length && /^\\s*>\\s?/.test(lines[index])) {
          quote.push(lines[index].replace(/^\\s*>\\s?/, ""));
          index += 1;
        }
        index -= 1;
        blocks.push({
          type: "quote",
          data: { alignment: "left", caption: "", text: quote.map(markdownInline).join("<br>") },
        });
        continue;
      }

      const unordered = line.match(/^\\s*[-+*]\\s+(.+)$/);
      const ordered = line.match(/^\\s*\\d+\\.\\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const style = ordered ? "ordered" : "unordered";
        const items = [];
        const pattern = ordered ? /^\\s*\\d+\\.\\s+(.+)$/ : /^\\s*[-+*]\\s+(.+)$/;
        while (index < lines.length) {
          const item = lines[index].match(pattern);
          if (!item) break;
          items.push({ content: markdownInline(item[1]), items: [], meta: {} });
          index += 1;
        }
        index -= 1;
        blocks.push({ type: "list", data: { items, meta: {}, style } });
        continue;
      }

      if (/^\\s*(?:-{3,}|\\*{3,}|_{3,})\\s*$/.test(line)) {
        flushParagraph();
        blocks.push({ type: "delimiter", data: {} });
        continue;
      }

      if (line.trim() === "") {
        flushParagraph();
        continue;
      }

      paragraph.push(line);
    }

    if (inCode) flushCode();
    flushParagraph();
    return { blocks };
  };

  window.markdownToEditorBlocks = markdownToBlocks;

  window.initEditorJs = (root, state) => {
    if (root.dataset.editorjsReady === "true") return;

    const form = root.closest("form");
    const holder = root.querySelector("[data-editorjs-holder]");
    const input = root.querySelector("[data-editorjs-input]");
    const importButton = form?.querySelector("[data-markdown-import]");
    const importDialog = root.querySelector("[data-markdown-dialog]");
    const markdownInput = root.querySelector("[data-markdown-input]");
    const convertButton = root.querySelector("[data-markdown-convert]");
    const cancelImport = root.querySelector("[data-markdown-cancel]");
    const toolButtons = root.querySelectorAll("[data-editorjs-tool]");
    const linkButton = root.querySelector("[data-editorjs-link]");
    if (!form || !holder || !input || !window.EditorJS) return;

    root.dataset.editorjsReady = "true";
    let changedVersion = 0;
    let savedVersion = 0;
    let saving = false;
    let retryAt = 0;
    let controller = null;
    let editorChangesReady = false;
    let submitting = false;

    const markChanged = () => {
      changedVersion += 1;
      state.saveState = "changed";
    };

    const markFormChanged = (event) => {
      if (event.target.closest("[data-editorjs-holder]")) return;
      markChanged();
    };

    form.addEventListener("input", markFormChanged);
    form.addEventListener("change", markFormChanged);

    let initialData;
    try {
      initialData = JSON.parse(input.value);
    } catch {
      initialData = { blocks: [] };
    }

    const editor = new window.EditorJS({
      autofocus: false,
      data: initialData,
      holder,
      inlineToolbar: true,
      minHeight: 320,
      onChange: () => {
        if (editorChangesReady) markChanged();
      },
      placeholder: holder.dataset.placeholder || "Start writing...",
      tools: {
        code: window.CodeTool,
        delimiter: window.Delimiter,
        header: {
          class: window.Header,
          config: { defaultLevel: 2, levels: [2, 3, 4] },
          shortcut: "CMD+SHIFT+H",
        },
        list: {
          class: window.EditorjsList,
          inlineToolbar: true,
        },
        quote: {
          class: window.Quote,
          inlineToolbar: true,
        },
      },
    });

    const syncEditor = async () => {
      await editor.isReady;
      input.value = JSON.stringify(await editor.save());
    };

    void editor.isReady.then(() => {
      editorChangesReady = true;
      toolButtons.forEach((button) => {
        button.disabled = false;
      });
      if (linkButton) linkButton.disabled = false;
    });

    const emptyBlockData = (type, listStyle) => {
      switch (type) {
        case "header":
          return { level: 2, text: "" };
        case "list":
          return { items: [], meta: {}, style: listStyle || "unordered" };
        case "quote":
          return { alignment: "left", caption: "", text: "" };
        case "code":
          return { code: "" };
        case "delimiter":
          return {};
        default:
          return { text: "" };
      }
    };

    toolButtons.forEach((button) => {
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", async () => {
        await editor.isReady;
        const type = button.dataset.editorjsTool;
        if (!type) return;

        const currentIndex = editor.blocks.getCurrentBlockIndex();
        const insertAt = currentIndex >= 0
          ? currentIndex + 1
          : editor.blocks.getBlocksCount();
        editor.blocks.insert(
          type,
          emptyBlockData(type, button.dataset.editorjsListStyle),
          undefined,
          insertAt,
          false,
        );
      });
    });

    linkButton?.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    linkButton?.addEventListener("click", async () => {
      await editor.isReady;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        window.alert("Select text in the editor before adding a link.");
        return;
      }

      const range = selection.getRangeAt(0).cloneRange();
      if (!holder.contains(range.commonAncestorContainer)) {
        window.alert("Select text in the editor before adding a link.");
        return;
      }

      const blockIndex = editor.blocks.getCurrentBlockIndex();
      const enteredHref = window.prompt(
        "Link URL (https://example.com or /internal-page)",
        "https://",
      );
      if (enteredHref === null) return;

      const href = enteredHref.trim();
      const lowerHref = href.toLowerCase();
      const isExternal = lowerHref.startsWith("https://") ||
        lowerHref.startsWith("http://");
      const isInternal = href.startsWith("/") && !href.startsWith("//");
      if (!isExternal && !isInternal) {
        window.alert("Use an http(s) URL or a root-relative path beginning with /.");
        return;
      }

      const anchor = document.createElement("a");
      anchor.setAttribute("href", href);
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
      selection.removeAllRanges();
      const linkedRange = document.createRange();
      linkedRange.selectNodeContents(anchor);
      selection.addRange(linkedRange);

      if (blockIndex >= 0) {
        editor.blocks.getBlockByIndex(blockIndex)?.dispatchChange();
      } else {
        markChanged();
      }
    });

    importButton?.addEventListener("click", () => {
      importDialog?.showModal();
      markdownInput?.focus();
    });

    cancelImport?.addEventListener("click", () => {
      importDialog?.close();
    });

    convertButton?.addEventListener("click", async () => {
      await editor.isReady;
      await editor.render(markdownToBlocks(markdownInput.value));
      markdownInput.value = "";
      importDialog?.close();
      markChanged();
    });

    const save = async () => {
      const versionToSave = changedVersion;
      saving = true;
      state.saveState = "saving";
      controller = new AbortController();

      try {
        await syncEditor();
        const formData = new FormData(form);
        formData.set("action", "autosave");
        const response = await fetch(form.action, {
          body: formData,
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          method: "POST",
          signal: controller.signal,
        });

        const result = await response.json();
        if (!response.ok) {
          const slugError = result?.error?.slug;
          const slugField = form.querySelector("[data-post-slug]");
          if (slugField && typeof slugError === "string") {
            slugField.dispatchEvent(
              new CustomEvent("post-slug:error", { detail: slugError }),
            );
          }
          throw new Error("Autosave failed with status " + response.status);
        }

        const idInput = form.querySelector('input[name="id"]');
        if (idInput && result.id) {
          idInput.value = String(result.id);
          const url = new URL(window.location.href);
          if (url.searchParams.get("id") !== String(result.id)) {
            url.searchParams.set("id", String(result.id));
            history.replaceState(null, "", url);
          }
        }
        const slugInput = form.querySelector('input[name="slug"]');
        if (slugInput && result.slug) {
          const slugField = form.querySelector("[data-post-slug]");
          if (slugField) {
            slugField.dispatchEvent(
              new CustomEvent("post-slug:resolved", { detail: result.slug }),
            );
          } else {
            slugInput.value = result.slug;
          }
        }

        savedVersion = versionToSave;
        state.saveState = changedVersion === savedVersion ? "saved" : "changed";
      } catch (error) {
        if (error.name !== "AbortError") {
          state.saveState = "error";
          retryAt = Date.now() + 1000;
        }
      } finally {
        saving = false;
        controller = null;
      }
    };

    const timer = setInterval(() => {
      if (
        !state.autosaveEnabled ||
        saving ||
        changedVersion === savedVersion ||
        Date.now() < retryAt
      ) {
        return;
      }

      void save();
    }, 5);

    form.addEventListener("submit", async (event) => {
      if (submitting) {
        clearInterval(timer);
        controller?.abort();
        return;
      }

      event.preventDefault();
      const submitter = event.submitter;

      try {
        await syncEditor();
        clearInterval(timer);
        controller?.abort();
        submitting = true;
        if (submitter) {
          form.requestSubmit(submitter);
        } else {
          form.requestSubmit();
        }
      } catch {
        state.saveState = "error";
      }
    });
  };
})();
`;

export const EditorJs: FC<EditorJsProps> = ({
  name,
  value,
  placeholder,
}) => {
  const sourceValue = value ?? "";
  const initialValue = JSON.stringify(normalizeEditorData(sourceValue));
  const legacyMarkdown = parseEditorData(sourceValue) ? "" : sourceValue;

  return (
    <div
      class="flex grow flex-col"
      data-editorjs
      {...{
        "x-data": "{ autosaveEnabled: true, saveState: 'saved' }",
        "x-init": "initEditorJs($el, $data)",
      }}
    >
      <div
        aria-label="Editor actions"
        class="flex items-center gap-1 rounded-t-md border border-b-0 border-amber-50/25 bg-amber-50/10 px-2 py-1 dark:border-mist-600/25 dark:bg-mist-600/10"
        role="toolbar"
      >
        <button
          aria-label="Add paragraph"
          class={editorToolButtonClass}
          data-editorjs-tool="paragraph"
          disabled
          title="Add paragraph"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M13 4v16" />
            <path d="M17 4v16" />
            <path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
          </svg>
        </button>
        <button
          aria-label="Add heading"
          class={editorToolButtonClass}
          data-editorjs-tool="header"
          disabled
          title="Add heading"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M4 12h8" />
            <path d="M4 18V6" />
            <path d="M12 18V6" />
            <path d="M17 12a3 3 0 1 1 6 0c0 2-3 3-6 6h6" />
          </svg>
        </button>
        <button
          aria-label="Add bulleted list"
          class={editorToolButtonClass}
          data-editorjs-list-style="unordered"
          data-editorjs-tool="list"
          disabled
          title="Add bulleted list"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
          </svg>
        </button>
        <button
          aria-label="Add numbered list"
          class={editorToolButtonClass}
          data-editorjs-list-style="ordered"
          data-editorjs-tool="list"
          disabled
          title="Add numbered list"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M10 6h11" />
            <path d="M10 12h11" />
            <path d="M10 18h11" />
            <path d="M4 6h1V3" />
            <path d="M4 10h2l-2 3h2" />
            <path d="M4 17.5c0-.8 2-.8 2 0S4 19 4 19s2-.2 2 1-2 1-2 0" />
          </svg>
        </button>
        <button
          aria-label="Add quote"
          class={editorToolButtonClass}
          data-editorjs-tool="quote"
          disabled
          title="Add quote"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h3c0 3-1 4-4 5" />
            <path d="M14 21c3 0 7-1 7-8V5c0-1.25-.75-2-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h3c0 3-1 4-4 5" />
          </svg>
        </button>
        <button
          aria-label="Add link to selected text"
          class={editorToolButtonClass}
          data-editorjs-link
          disabled
          title="Add link to selected text"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
            <path d="M8 12h8" />
          </svg>
        </button>
        <button
          aria-label="Add code block"
          class={editorToolButtonClass}
          data-editorjs-tool="code"
          disabled
          title="Add code block"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="m16 18 6-6-6-6" />
            <path d="m8 6-6 6 6 6" />
          </svg>
        </button>
        <button
          aria-label="Add divider"
          class={editorToolButtonClass}
          data-editorjs-tool="delimiter"
          disabled
          title="Add divider"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M5 12h14" />
          </svg>
        </button>

        <div class="ml-auto flex items-center gap-2">
          <span
            aria-live="polite"
            class="min-w-12 text-right text-[0.7rem] text-amber-50/70 dark:text-mist-600/70"
            {...{
              "x-text":
                "!autosaveEnabled ? 'Off' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Retrying…' : saveState === 'saved' ? 'Saved' : ''",
            }}
          />
          <Button
            aria-label="Disable autosave"
            aria-pressed="true"
            class="!text-amber-50"
            data-autosave-toggle
            size="sm"
            title="Toggle autosave"
            type="button"
            variant="secondary"
            {...{
              "x-bind:aria-label":
                "autosaveEnabled ? 'Disable autosave' : 'Enable autosave'",
              "x-bind:aria-pressed": "autosaveEnabled.toString()",
              "x-on:click": "autosaveEnabled = !autosaveEnabled",
            }}
          >
            <svg
              class={iconClass}
              data-autosave-icon="saved"
              {...commonSvgProps}
              {...{
                "x-show": "autosaveEnabled && saveState === 'saved'",
              }}
            >
              <path d="M12.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10.2a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4v4.35" />
              <path d="m16 19 2 2 4-4" />
              <path d="M17 15.13V14a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
              <path d="M7 3v4a1 1 0 0 0 1 1h7" />
            </svg>
            <svg
              class={iconClass}
              data-autosave-icon="changed"
              style="display: none"
              {...commonSvgProps}
              {...{
                "x-show": "autosaveEnabled && saveState === 'changed'",
              }}
            >
              <path d="M13.33 13H8a1 1 0 00-1 1v7" />
              <path d="M14.363 17.634a2 2 0 00-.506.854l-.837 2.87a.5.5 0 00.62.62l2.87-.837a2 2 0 00.854-.506l4.013-4.009a1 1 0 10-3.004-3.004z" />
              <path d="M7 3v4a1 1 0 001 1h7" />
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h10.2a2 2 0 011.4.6l3.8 3.8a2 2 0 01.6 1.4v.3" />
            </svg>
            <svg
              class={iconClass}
              data-autosave-icon="saving"
              style="display: none"
              {...commonSvgProps}
              {...{
                "x-show": "autosaveEnabled && saveState === 'saving'",
              }}
            >
              <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
              <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
              <path d="M7 3v4a1 1 0 0 0 1 1h7" />
            </svg>
            <svg
              class={iconClass}
              data-autosave-icon="off"
              style="display: none"
              {...commonSvgProps}
              {...{
                "x-show": "!autosaveEnabled || saveState === 'error'",
              }}
            >
              <path d="M13 13H8a1 1 0 0 0-1 1v7" />
              <path d="M14 8h1" />
              <path d="M17 21v-4" />
              <path d="m2 2 20 20" />
              <path d="M20.41 20.41A2 2 0 0 1 19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 .59-1.41" />
              <path d="M29.5 11.5s5 5 4 5" />
              <path d="M9 3h6.2a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V15" />
            </svg>
          </Button>
        </div>
      </div>
      <input
        data-editorjs-input
        name={name}
        type="hidden"
        value={initialValue}
      />
      <div
        class={`editor-js min-h-80 grow rounded-b-md border px-3 py-2 ${panelField}`}
        data-editorjs-holder
        data-placeholder={placeholder ?? "Start writing..."}
      />
      <dialog
        aria-labelledby="markdown-import-title"
        class={`m-auto w-full max-w-xl rounded-xl border p-6 backdrop:bg-onyx-950/70 ${panelSurface}`}
        data-markdown-dialog
      >
        <h2 class="text-xl font-semibold" id="markdown-import-title">
          Convert Markdown
        </h2>
        <p class="mt-2 text-sm opacity-70">
          This replaces the current Editor.js body with converted blocks.
        </p>
        <Textarea
          class={`mt-4 min-h-80 ${panelField}`}
          data-markdown-input
          placeholder="Paste Markdown here..."
        >
          {legacyMarkdown}
        </Textarea>
        <div class="mt-4 flex justify-end gap-2">
          <Button
            class={panelOutlineButton}
            data-markdown-cancel
            size="sm"
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button data-markdown-convert size="sm" type="button">
            Convert
          </Button>
        </div>
      </dialog>
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.31.6" />
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/header@2.8.9" />
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/list@2.0.9" />
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/quote@2.7.6" />
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/code@2.9.4" />
      <script src="https://cdn.jsdelivr.net/npm/@editorjs/delimiter@1.4.2" />
      <script dangerouslySetInnerHTML={{ __html: editorJsScript }} />
    </div>
  );
};
