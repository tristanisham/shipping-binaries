import type { FC } from "hono/jsx";
import { Button } from "../ui/Button.js";
import { Textarea } from "../ui/Textarea.js";
import { escapeHtml } from "../ui/utils.js";
import { type EditorData, parseEditorData } from "../editorData.js";
import { panelField, panelOutlineButton, panelSurface } from "./panel.js";

type EditorJsProps = {
  name: string;
  value?: string;
  placeholder?: string;
};

const escapeLegacyText = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, "<br>");

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
    const usedFootnoteIds = new Set(
      Array.from(
        markdown.matchAll(/^\\[\\^([A-Za-z0-9_-]+)\\]:/gm),
        (match) => match[1],
      ),
    );
    const inlineFootnotes = [];
    let inlineFootnoteNumber = 1;
    const normalizedMarkdown = markdown.replace(
      /\\^\\[([^\\]\\n]+)\\]/g,
      (_match, text) => {
        let id = "obsidian-inline-" + inlineFootnoteNumber;
        while (usedFootnoteIds.has(id)) {
          inlineFootnoteNumber += 1;
          id = "obsidian-inline-" + inlineFootnoteNumber;
        }
        inlineFootnoteNumber += 1;
        usedFootnoteIds.add(id);
        inlineFootnotes.push({ id, text });
        return "[^" + id + "]";
      },
    );
    const lines = normalizedMarkdown
      .replace(/\\r\\n/g, "\\n")
      .split("\\n");
    const blocks = [];
    const footnotes = inlineFootnotes.map((footnote) => ({
      type: "footnote",
      data: {
        id: footnote.id,
        text: markdownInline(footnote.text),
      },
    }));
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

      const footnote = line.match(/^\\[\\^([A-Za-z0-9_-]+)\\]:\\s*(.*)$/);
      if (footnote && !inCode) {
        flushParagraph();
        const definition = [footnote[2]];
        while (
          index + 1 < lines.length &&
          /^(?: {2,}|\\t)\\S/.test(lines[index + 1])
        ) {
          index += 1;
          definition.push(lines[index].trim());
        }
        footnotes.push({
          type: "footnote",
          data: {
            id: footnote[1],
            text: definition.map(markdownInline).join("<br>"),
          },
        });
        continue;
      }

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
    return { blocks: blocks.concat(footnotes) };
  };

  const inlineHtmlToMarkdown = (value) => {
    const render = (source) =>
      String(source || "")
        .replace(
          /<a\\b[^>]*href=(["'])(.*?)\\1[^>]*>([\\s\\S]*?)<\\/a>/gi,
          (_match, _quote, href, text) =>
            "[" + render(text) + "](" + href + ")",
        )
        .replace(/<(?:strong|b)>([\\s\\S]*?)<\\/(?:strong|b)>/gi, "**$1**")
        .replace(/<(?:em|i)>([\\s\\S]*?)<\\/(?:em|i)>/gi, "*$1*")
        .replace(/<(?:del|s)>([\\s\\S]*?)<\\/(?:del|s)>/gi, "~~$1~~")
        .replace(/<code>([\\s\\S]*?)<\\/code>/gi, backtick + "$1" + backtick)
        .replace(/<br\\s*\\/?>/gi, "\\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&");

    return render(value);
  };

  const listItemsToMarkdown = (items, style, depth = 0) =>
    (Array.isArray(items) ? items : []).flatMap((item, index) => {
      const prefix = style === "ordered" ? String(index + 1) + "." : "-";
      const indentation = "  ".repeat(depth);
      const lines = [
        indentation + prefix + " " + inlineHtmlToMarkdown(item?.content),
      ];
      if (Array.isArray(item?.items) && item.items.length > 0) {
        lines.push(
          ...listItemsToMarkdown(item.items, style, depth + 1),
        );
      }
      return lines;
    }).join("\\n");

  const editorDataToMarkdown = (data) =>
    (Array.isArray(data?.blocks) ? data.blocks : []).map((block) => {
      const blockData = block?.data || {};
      switch (block?.type) {
        case "paragraph":
          return inlineHtmlToMarkdown(blockData.text);
        case "header": {
          const level = Math.min(6, Math.max(1, Number(blockData.level) || 2));
          return "#".repeat(level) + " " + inlineHtmlToMarkdown(blockData.text);
        }
        case "list":
          return listItemsToMarkdown(
            blockData.items,
            blockData.style === "ordered" ? "ordered" : "unordered",
          );
        case "quote": {
          const quote = inlineHtmlToMarkdown(blockData.text)
            .split("\\n")
            .map((line) => "> " + line)
            .join("\\n");
          const caption = inlineHtmlToMarkdown(blockData.caption);
          return caption ? quote + "\\n>\\n> — " + caption : quote;
        }
        case "code": {
          const code = String(blockData.code || "");
          const fence = code.includes(codeFence) ? backtick.repeat(4) : codeFence;
          return fence + "\\n" + code + "\\n" + fence;
        }
        case "delimiter":
          return "---";
        case "footnote":
          return "[^" + String(blockData.id || "") + "]: " +
            inlineHtmlToMarkdown(blockData.text).replace(/\\n/g, "\\n  ");
        default:
          return "<!-- Unsupported Editor.js block: " +
            String(block?.type || "unknown") + " -->";
      }
    }).join("\\n\\n");

  const encodeUtf8Base64 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(index, index + 0x8000),
      );
    }
    return btoa(binary);
  };

  const decodeUtf8Base64 = (value) => {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );
    return new TextDecoder().decode(bytes);
  };

  const createShippingBinariesMarkdown = (snapshot) => {
    const post = snapshot?.post || {};
    const editor = snapshot?.editor || { blocks: [] };
    const frontmatter = [
      "---",
      "title: " + JSON.stringify(String(post.title || "")),
      "description: " + JSON.stringify(String(post.description || "")),
      "slug: " + JSON.stringify(String(post.slug || "")),
      "slugMode: " + JSON.stringify(
        post.slugMode === "auto" ? "auto" : "custom",
      ),
      "keywords: " + JSON.stringify(String(post.keywords || "")),
      "image: " + JSON.stringify(String(post.image || "")),
      "draft: " + (post.draft ? "true" : "false"),
      "shippingBinariesFormat: 1",
      "---",
    ].join("\\n");
    const payload = {
      editor,
      format: "shipping-binaries-markdown",
      post: {
        description: String(post.description || ""),
        draft: Boolean(post.draft),
        image: String(post.image || ""),
        keywords: String(post.keywords || ""),
        slug: String(post.slug || ""),
        slugMode: post.slugMode === "auto" ? "auto" : "custom",
        title: String(post.title || ""),
      },
      version: 1,
    };
    const body = editorDataToMarkdown(editor).trim();
    const marker = "<!-- shipping-binaries-export:v1:" +
      encodeUtf8Base64(JSON.stringify(payload)) + " -->";
    return frontmatter + "\\n\\n" + (body ? body + "\\n\\n" : "") + marker +
      "\\n";
  };

  const parseShippingBinariesMarkdown = (markdown) => {
    const marker = String(markdown || "").match(
      /<!--\\s*shipping-binaries-export:v1:([A-Za-z0-9+/=]+)\\s*-->\\s*$/,
    );
    if (!marker) return null;

    try {
      const payload = JSON.parse(decodeUtf8Base64(marker[1]));
      if (
        payload?.format !== "shipping-binaries-markdown" ||
        payload?.version !== 1 ||
        !Array.isArray(payload?.editor?.blocks) ||
        typeof payload?.post !== "object" ||
        payload.post === null
      ) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  };

  window.markdownToEditorBlocks = markdownToBlocks;
  window.createShippingBinariesMarkdown = createShippingBinariesMarkdown;
  window.parseShippingBinariesMarkdown = parseShippingBinariesMarkdown;

  class FootnoteTool {
    static get toolbox() {
      return {
        title: "Footnote",
        icon: '<svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 4h8M9 4v16M5 20h8M17 8h4M19 6v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      };
    }

    static get isReadOnlySupported() {
      return true;
    }

    static get sanitize() {
      return {
        id: false,
        text: {
          a: { href: true },
          b: true,
          br: true,
          code: true,
          del: true,
          em: true,
          i: true,
          s: true,
          strong: true,
          u: true,
        },
      };
    }

    constructor({ data }) {
      this.data = data || {};
      this.wrapper = null;
    }

    render() {
      const wrapper = document.createElement("div");
      wrapper.className = "space-y-2 rounded-md border border-current/20 p-3";

      const id = document.createElement("input");
      id.className = "cdx-input";
      id.dataset.footnoteId = "";
      id.placeholder = "Footnote label (for example: 1 or source)";
      id.value = typeof this.data.id === "string" ? this.data.id : "";
      id.setAttribute("aria-label", "Footnote label");
      id.addEventListener("input", () => {
        id.value = id.value.replace(/[^A-Za-z0-9_-]/g, "");
      });

      const text = document.createElement("div");
      text.className = "ce-paragraph cdx-block cdx-input";
      text.contentEditable = "true";
      text.dataset.footnoteText = "";
      text.dataset.placeholder = "Footnote text";
      text.innerHTML = typeof this.data.text === "string" ? this.data.text : "";
      text.setAttribute("aria-label", "Footnote text");

      wrapper.append(id, text);
      this.wrapper = wrapper;
      return wrapper;
    }

    save() {
      const id = this.wrapper?.querySelector("[data-footnote-id]");
      const text = this.wrapper?.querySelector("[data-footnote-text]");
      return {
        id: id?.value.trim() || "",
        text: text?.innerHTML.trim() || "",
      };
    }

    validate(data) {
      return Boolean(data.id && data.text);
    }
  }

  class InlineFootnoteTool {
    static get isInline() {
      return true;
    }

    static get title() {
      return "Footnote";
    }

    static get shortcut() {
      return "CTRL+ALT+I";
    }

    constructor({ api }) {
      this.api = api;
      this.actions = null;
      this.blockIndex = -1;
      this.button = null;
      this.labelInput = null;
      this.noteInput = null;
      this.range = null;
    }

    render() {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = '<svg style="height:14px;width:14px" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h8M9 4v16M5 20h8M17 8h4M19 6v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      button.classList.add(this.api.styles.inlineToolButton);
      button.setAttribute("aria-label", "Add footnote");
      this.button = button;
      return button;
    }

    surround(range) {
      if (!range || range.collapsed || !this.actions) return;

      this.range = range.cloneRange();
      this.blockIndex = this.api.blocks.getCurrentBlockIndex();
      this.labelInput.value = this.nextAvailableId();
      this.labelInput.setCustomValidity("");
      this.noteInput.value = "";
      this.noteInput.setCustomValidity("");
      this.actions.hidden = false;
      this.actions
        .closest(".ce-inline-toolbar")
        ?.classList.add("!w-96", "!max-w-[calc(100vw-2rem)]");
      this.actions.parentElement?.classList.add("!overflow-x-visible");
      this.button?.classList.add(this.api.styles.inlineToolButtonActive);
      requestAnimationFrame(() => this.noteInput.focus());
    }

    renderActions() {
      const actions = document.createElement("div");
      actions.className = "w-full space-y-2 p-2";
      actions.hidden = true;
      actions.setAttribute("aria-label", "Add footnote");
      actions.setAttribute("role", "form");

      const labelField = document.createElement("label");
      labelField.className = "block space-y-1 text-xs font-medium";
      labelField.append(document.createTextNode("Label"));

      const labelInput = document.createElement("input");
      labelInput.classList.add(this.api.styles.input);
      labelInput.autocomplete = "off";
      labelInput.pattern = "[A-Za-z0-9_-]+";
      labelInput.placeholder = "source";
      labelInput.required = true;
      labelInput.setAttribute("aria-label", "Footnote label");
      labelInput.addEventListener("input", () => {
        labelInput.value = labelInput.value.replace(/[^A-Za-z0-9_-]/g, "");
        labelInput.setCustomValidity("");
      });
      labelField.append(labelInput);

      const noteField = document.createElement("label");
      noteField.className = "block space-y-1 text-xs font-medium";
      noteField.append(document.createTextNode("Note"));

      const noteInput = document.createElement("textarea");
      noteInput.classList.add(this.api.styles.input);
      noteInput.placeholder = "Footnote text";
      noteInput.required = true;
      noteInput.rows = 3;
      noteInput.setAttribute("aria-label", "Footnote note");
      noteInput.addEventListener("input", () => {
        noteInput.setCustomValidity("");
      });
      noteField.append(noteInput);

      const submit = document.createElement("button");
      submit.className = "w-full rounded-md bg-chocolate-500 px-3 py-2 text-sm font-medium text-chocolate-950 hover:bg-chocolate-400";
      submit.textContent = "Add footnote";
      submit.type = "button";
      submit.addEventListener("click", () => this.commit());

      actions.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.commit();
        }
      });
      actions.append(labelField, noteField, submit);
      this.actions = actions;
      this.labelInput = labelInput;
      this.noteInput = noteInput;
      return actions;
    }

    nextAvailableId() {
      const usedIds = this.usedIds();
      let number = 1;
      let id = "inline-footnote-" + number;
      while (usedIds.has(id)) {
        number += 1;
        id = "inline-footnote-" + number;
      }
      return id;
    }

    usedIds() {
      return new Set(
        Array.from(document.querySelectorAll("[data-footnote-id]"))
          .map((input) => input.value)
          .filter(Boolean),
      );
    }

    commit() {
      if (!this.range || !this.labelInput || !this.noteInput) return;

      const id = this.labelInput.value.trim();
      const footnoteText = this.noteInput.value.trim();
      if (id && this.usedIds().has(id)) {
        this.labelInput.setCustomValidity("That footnote label is already in use.");
      }
      if (!this.labelInput.reportValidity()) return;
      if (!footnoteText) {
        this.noteInput.setCustomValidity("Enter the footnote text.");
      }
      if (!this.noteInput.reportValidity()) return;

      const marker = document.createTextNode("[^" + id + "]");
      this.range.collapse(false);
      this.range.insertNode(marker);

      const selection = window.getSelection();
      if (selection) {
        const caret = document.createRange();
        caret.setStartAfter(marker);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
      }

      if (this.blockIndex >= 0) {
        this.api.blocks.getBlockByIndex(this.blockIndex)?.dispatchChange();
      }
      this.api.blocks.insert(
        "footnote",
        { id, text: markdownInline(footnoteText) },
        undefined,
        this.api.blocks.getBlocksCount(),
        false,
      );
      this.clear();
    }

    checkState() {
      return false;
    }

    clear() {
      this.range = null;
      this.blockIndex = -1;
      if (this.actions) {
        this.actions
          .closest(".ce-inline-toolbar")
          ?.classList.remove("!w-96", "!max-w-[calc(100vw-2rem)]");
        this.actions.parentElement?.classList.remove("!overflow-x-visible");
        this.actions.hidden = true;
      }
      this.button?.classList.remove(this.api.styles.inlineToolButtonActive);
    }
  }

  window.initEditorJs = (root, state) => {
    if (root.dataset.editorjsReady === "true") return;

    const form = root.closest("form");
    const holder = root.querySelector("[data-editorjs-holder]");
    const input = root.querySelector("[data-editorjs-input]");
    const importButton = form?.querySelector("[data-markdown-import]");
    const exportButton = form?.querySelector("[data-markdown-export]");
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
        footnote: FootnoteTool,
        footnoteInline: InlineFootnoteTool,
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

    const formValue = (name) => {
      const field = form.querySelector('[name="' + name + '"]');
      return typeof field?.value === "string" ? field.value : "";
    };

    const postSnapshot = () => {
      const draft = form.querySelector('input[name="currentDraft"]');
      return {
        description: formValue("description"),
        draft: Boolean(draft?.checked),
        image: formValue("image"),
        keywords: formValue("keywords"),
        slug: formValue("slug"),
        slugMode: formValue("slugMode") === "auto" ? "auto" : "custom",
        title: formValue("title"),
      };
    };

    const applyPostSnapshot = (post) => {
      const assign = (name, value) => {
        const field = form.querySelector('[name="' + name + '"]');
        if (!field || typeof field.value !== "string") return;
        field.value = String(value || "");
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      };

      assign("title", post.title);
      assign("description", post.description);
      assign("keywords", post.keywords);
      assign("image", post.image);
      assign("slug", post.slug);

      const slugMode = form.querySelector('input[name="slugMode"]');
      if (slugMode) {
        slugMode.value = post.slugMode === "auto" ? "auto" : "custom";
      }

      const draft = form.querySelector('input[name="currentDraft"]');
      if (draft) {
        draft.checked = Boolean(post.draft);
        draft.dispatchEvent(new Event("change", { bubbles: true }));
      }
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
        case "footnote":
          return { id: "", text: "" };
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

    exportButton?.addEventListener("click", async () => {
      await editor.isReady;
      const editorData = await editor.save();
      input.value = JSON.stringify(editorData);
      const snapshot = {
        editor: editorData,
        post: postSnapshot(),
      };
      const markdown = createShippingBinariesMarkdown(snapshot);
      const filenameBase = (snapshot.post.slug || snapshot.post.title || "post")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "post";
      const url = URL.createObjectURL(
        new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.download = filenameBase + ".md";
      link.href = url;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    });

    cancelImport?.addEventListener("click", () => {
      importDialog?.close();
    });

    convertButton?.addEventListener("click", async () => {
      await editor.isReady;
      const packagedPost = parseShippingBinariesMarkdown(markdownInput.value);
      if (packagedPost) {
        await editor.render(packagedPost.editor);
        applyPostSnapshot(packagedPost.post);
      } else {
        await editor.render(markdownToBlocks(markdownInput.value));
      }
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
        formData.delete("action");
        formData.set("postAction", "autosave");
        const saveUrl = new URL(
          form.getAttribute("action") || window.location.href,
          window.location.href,
        );
        const response = await fetch(saveUrl, {
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
    }, 500);

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
          aria-label="Add footnote"
          class={editorToolButtonClass}
          data-editorjs-tool="footnote"
          disabled
          title="Add footnote"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M5 4h8" />
            <path d="M9 4v16" />
            <path d="M5 20h8" />
            <path d="M17 8h4" />
            <path d="M19 6v4" />
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
                "!autosaveEnabled ? 'Autosave off' : saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Retrying…' : saveState === 'saved' ? 'Saved' : ''",
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
              "x-bind:class":
                "autosaveEnabled ? '!bg-chocolate-500 !text-amber-50 hover:!bg-chocolate-400' : '!bg-transparent !text-amber-50 !shadow-none hover:!bg-amber-50/10 dark:!text-mist-600 dark:hover:!bg-mist-600/10'",
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
          Shipping Binaries exports restore all post fields and editor blocks.
          Other Markdown replaces the body with converted blocks; Google Drive
          and Obsidian footnotes are detected automatically.
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
          <Button
            class="capitalize !text-amber-50"
            data-markdown-convert
            size="sm"
            type="button"
            variant="secondary"
          >
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
