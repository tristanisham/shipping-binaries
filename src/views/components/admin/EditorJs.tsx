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

const isEmailCaptureBlock = (block: unknown): boolean =>
  typeof block === "object" && block !== null && "type" in block &&
  block.type === "emailCapture";

export const normalizeEditorData = (
  value = "",
): EditorData => {
  const parsed = parseEditorData(value);
  if (parsed) {
    return {
      ...parsed,
      blocks: parsed.blocks.filter((block) => !isEmailCaptureBlock(block)),
    };
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
  // The Markdown serializer and importer live in src/markdown/post-markdown.ts
  // and reach this script as globals from /js/post-markdown.js, which the
  // write page loads first. The Worker imports the same module for the bulk
  // post export, so there is one implementation of the format.

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
        { id, text: window.markdownInline(footnoteText) },
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
    const previewButton = form?.querySelector("[data-preview]");
    const exportButton = form?.querySelector("[data-markdown-export]");
    const exportMenuRoot = form?.querySelector(
      "[data-markdown-export-menu-root]",
    );
    const exportMenu = form?.querySelector("[data-markdown-export-menu]");
    const exportObsidianButton = form?.querySelector(
      "[data-markdown-export-obsidian]",
    );
    const exportBearButton = form?.querySelector("[data-markdown-export-bear]");
    const exportEditorDataButton = form?.querySelector(
      "[data-markdown-export-editor-data]",
    );
    const importDialog = root.querySelector("[data-markdown-dialog]");
    const markdownInput = root.querySelector("[data-markdown-input]");
    const convertButton = root.querySelector("[data-markdown-convert]");
    const cancelImport = root.querySelector("[data-markdown-cancel]");
    const toolButtons = root.querySelectorAll("[data-editorjs-tool]");
    const inlineCommandButtons = root.querySelectorAll(
      "[data-editorjs-inline-command]",
    );
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

    // Only fields the source actually carried are applied, so importing a note
    // that omits a key leaves the value already in the form alone.
    const applyPostSnapshot = (post) => {
      const assign = (name, value) => {
        if (value === undefined) return;
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
      if (slugMode && post.slugMode !== undefined) {
        slugMode.value = post.slugMode === "auto" ? "auto" : "custom";
      }

      const draft = form.querySelector('input[name="currentDraft"]');
      if (draft && post.draft !== undefined) {
        draft.checked = Boolean(post.draft);
        draft.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    void editor.isReady.then(() => {
      editorChangesReady = true;
      toolButtons.forEach((button) => {
        button.disabled = false;
      });
      inlineCommandButtons.forEach((button) => {
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

    const editorSelectionRange = (requireText = false) => {
      const selection = window.getSelection();
      if (
        !selection || selection.rangeCount === 0 ||
        (requireText && selection.isCollapsed)
      ) {
        return null;
      }

      const range = selection.getRangeAt(0);
      return holder.contains(range.commonAncestorContainer) ? range : null;
    };

    const dispatchInlineChange = () => {
      const blockIndex = editor.blocks.getCurrentBlockIndex();
      if (blockIndex >= 0) {
        editor.blocks.getBlockByIndex(blockIndex)?.dispatchChange();
      } else {
        markChanged();
      }
    };

    const toggleInlineCommand = (command, showAlert = false) => {
      if (!editorSelectionRange()) {
        if (showAlert) {
          window.alert("Place the cursor in the editor before formatting text.");
        }
        return false;
      }

      document.execCommand(command);
      dispatchInlineChange();
      return true;
    };

    const openLinkMenu = (showAlert = false) => {
      const range = editorSelectionRange(true)?.cloneRange();
      if (!range) {
        if (showAlert) {
          window.alert("Select text in the editor before adding a link.");
        }
        return false;
      }

      const selection = window.getSelection();
      const enteredHref = window.prompt(
        "Link URL (https://example.com or /internal-page)",
        "https://",
      );
      if (enteredHref === null) return false;

      const href = enteredHref.trim();
      const lowerHref = href.toLowerCase();
      const isExternal = lowerHref.startsWith("https://") ||
        lowerHref.startsWith("http://");
      const isInternal = href.startsWith("/") && !href.startsWith("//");
      if (!isExternal && !isInternal) {
        window.alert("Use an http(s) URL or a root-relative path beginning with /.");
        return false;
      }

      const anchor = document.createElement("a");
      anchor.setAttribute("href", href);
      anchor.appendChild(range.extractContents());
      range.insertNode(anchor);
      selection?.removeAllRanges();
      const linkedRange = document.createRange();
      linkedRange.selectNodeContents(anchor);
      selection?.addRange(linkedRange);
      dispatchInlineChange();
      return true;
    };

    inlineCommandButtons.forEach((button) => {
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", () => {
        const command = button.dataset.editorjsInlineCommand;
        if (command) toggleInlineCommand(command, true);
      });
    });

    linkButton?.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    linkButton?.addEventListener("click", () => {
      openLinkMenu(true);
    });

    holder.addEventListener("keydown", (event) => {
      if (
        !event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const command = key === "b" ? "bold" : key === "i" ? "italic" : null;
      if (command && editorSelectionRange()) {
        event.preventDefault();
        event.stopPropagation();
        toggleInlineCommand(command);
        return;
      }

      if (key === "k" && editorSelectionRange(true)) {
        event.preventDefault();
        event.stopPropagation();
        openLinkMenu();
      }
    });

    importButton?.addEventListener("click", () => {
      importDialog?.showModal();
      markdownInput?.focus();
    });

    const closeExportMenu = (restoreFocus = false) => {
      if (!exportMenu || exportMenu.hidden) return;
      exportMenu.hidden = true;
      exportButton?.setAttribute("aria-expanded", "false");
      if (restoreFocus) exportButton?.focus();
    };

    exportButton?.addEventListener("click", () => {
      if (!exportMenu) return;
      const willOpen = exportMenu.hidden;
      exportMenu.hidden = !willOpen;
      exportButton.setAttribute("aria-expanded", String(willOpen));
    });

    document.addEventListener("click", (event) => {
      if (exportMenuRoot?.contains(event.target)) return;
      closeExportMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeExportMenu(true);
    });

    const downloadMarkdown = async (options) => {
      closeExportMenu();
      await editor.isReady;
      const editorData = await editor.save();
      input.value = JSON.stringify(editorData);
      const snapshot = {
        editor: editorData,
        post: postSnapshot(),
      };
      const markdown = window.createShippingBinariesMarkdown(snapshot, options);
      const filenameBase = (snapshot.post.slug || snapshot.post.title || "post")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "post";
      const url = URL.createObjectURL(
        new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.download = filenameBase +
        (options?.includeEditorData ? ".ejs.md" : ".md");
      link.href = url;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    exportObsidianButton?.addEventListener("click", () => {
      void downloadMarkdown({ flavor: "obsidian", includeEditorData: false });
    });

    exportBearButton?.addEventListener("click", () => {
      void downloadMarkdown({ flavor: "bear", includeEditorData: false });
    });

    exportEditorDataButton?.addEventListener("click", () => {
      void downloadMarkdown({ flavor: "obsidian", includeEditorData: true });
    });

    cancelImport?.addEventListener("click", () => {
      importDialog?.close();
    });

    convertButton?.addEventListener("click", async () => {
      await editor.isReady;
      const source = markdownInput.value;
      const packagedPost = window.parseShippingBinariesMarkdown(source);
      if (packagedPost) {
        await editor.render(packagedPost.editor);
        applyPostSnapshot(packagedPost.post);
      } else {
        const imported = window.parseMarkdownImport(source);
        await editor.render({ blocks: imported.blocks });
        applyPostSnapshot(imported.post);
      }
      markdownInput.value = "";
      importDialog?.close();
      markChanged();
    });

    // Shared by autosave and preview: a save can mint the post id and settle
    // the slug, and both have to land in the form or the next save creates a
    // second post.
    const applySaveResult = (result) => {
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
    };

    const saveForPreview = async () => {
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
      });

      const result = await response.json();
      if (!response.ok || !result?.slug) {
        const slugError = result?.error?.slug;
        const slugField = form.querySelector("[data-post-slug]");
        if (slugField && typeof slugError === "string") {
          slugField.dispatchEvent(
            new CustomEvent("post-slug:error", { detail: slugError }),
          );
        }
        throw new Error("Preview save failed with status " + response.status);
      }

      applySaveResult(result);
      return result.slug;
    };

    previewButton?.addEventListener("click", async () => {
      // Opened before the await: a tab opened after one has lost the click's
      // transient activation and is treated as a popup.
      const tab = window.open("", "_blank");

      try {
        const slug = await saveForPreview();
        const href = "/preview/" + encodeURIComponent(slug);
        if (tab) {
          tab.location = href;
        } else {
          window.open(href, "_blank");
        }
      } catch (error) {
        tab?.close();
        window.alert(
          "The post could not be saved, so there is nothing to preview yet.",
        );
      }
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

        applySaveResult(result);

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
  const initialValue = JSON.stringify(
    normalizeEditorData(sourceValue),
  );
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
          aria-label="Toggle bold"
          class={editorToolButtonClass}
          data-editorjs-inline-command="bold"
          disabled
          title="Toggle bold (Ctrl+B)"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M6 12h9a4 4 0 0 0 0-8H6v16h9a4 4 0 0 0 0-8Z" />
          </svg>
        </button>
        <button
          aria-label="Toggle italic"
          class={editorToolButtonClass}
          data-editorjs-inline-command="italic"
          disabled
          title="Toggle italic (Ctrl+I)"
          type="button"
        >
          <svg class={iconClass} {...commonSvgProps}>
            <path d="M19 4h-9" />
            <path d="M14 20H5" />
            <path d="M15 4 9 20" />
          </svg>
        </button>
        <button
          aria-label="Add link to selected text"
          class={editorToolButtonClass}
          data-editorjs-link
          disabled
          title="Add link to selected text (Ctrl+K)"
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
