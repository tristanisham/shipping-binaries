import type { FC } from "hono/jsx";
import { Button } from "../ui/Button.js";
import { Textarea } from "../ui/Textarea.js";

type CommentEditorProps = {
  action: string;
};

const commentEditorScript = `
(() => {
  const root = document.querySelector("[data-comment-editor]");
  if (!root || root.dataset.ready === "true" || !window.EditorJS) return;

  root.dataset.ready = "true";
  const form = root.querySelector("form");
  const holder = root.querySelector("[data-comment-editor-holder]");
  const input = root.querySelector('textarea[name="content"]');
  const parentInput = root.querySelector('input[name="parentId"]');
  const replyStatus = root.querySelector("[data-comment-reply-status]");
  const replyName = root.querySelector("[data-comment-reply-name]");
  const cancel = root.querySelector("[data-comment-cancel]");
  if (!form || !holder || !input || !parentInput || !replyStatus) return;

  input.hidden = true;
  holder.hidden = false;

  const editor = new window.EditorJS({
    holder,
    minHeight: 120,
    placeholder: "Write a comment...",
  });

  const clearReply = () => {
    parentInput.value = "";
    replyStatus.hidden = true;
    if (replyName) replyName.textContent = "";
  };

  window.replyToComment = (id, displayName) => {
    parentInput.value = String(id);
    if (replyName) replyName.textContent = displayName;
    replyStatus.hidden = false;
    root.scrollIntoView({ behavior: "smooth", block: "center" });
    editor.isReady.then(() => editor.focus(true));
  };

  cancel?.addEventListener("click", () => {
    clearReply();
    editor.isReady.then(() => editor.clear());
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const data = await editor.save();
      const hasContent = data.blocks.some((block) => {
        const text = block && block.data && typeof block.data.text === "string"
          ? block.data.text.replace(/<[^>]*>/g, "").trim()
          : "";
        return text.length > 0;
      });

      if (!hasContent) {
        window.showToast?.("Write a comment first.");
        return;
      }

      input.value = JSON.stringify(data);
      form.submit();
    } catch {
      window.showToast?.("The comment could not be prepared.");
    }
  });
})();
`;

export const CommentEditor: FC<CommentEditorProps> = ({ action }) => (
  <div data-comment-editor>
    <form action={action} method="post">
      <input name="parentId" type="hidden" value="" />
      <p
        class="mb-2 text-sm font-semibold"
        data-comment-reply-status
        hidden
      >
        Replying to <span data-comment-reply-name />
      </p>
      <Textarea
        class="min-h-32 w-full resize-y"
        name="content"
        placeholder="Write a comment..."
        rows={5}
      />
      <div
        class="min-h-32 w-full rounded-md border border-onyx-300 bg-amber-50/70 px-3 py-2 shadow-xs focus-within:border-burgundy-600 focus-within:ring-[3px] focus-within:ring-chocolate-500/30 dark:border-onyx-700 dark:bg-onyx-950/60 dark:focus-within:border-burgundy-400 dark:focus-within:ring-chocolate-400/30"
        data-comment-editor-holder
        hidden
      />
      <div class="mt-3 flex justify-end gap-2">
        <Button
          class="border-mist-600/30 text-mist-600 dark:border-amber-50/30 dark:text-amber-50"
          data-comment-cancel
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button size="sm" type="submit" variant="tertiary">
          Comment
        </Button>
      </div>
    </form>
    <script src="https://cdn.jsdelivr.net/npm/@editorjs/editorjs@2.31.6" />
    <script dangerouslySetInnerHTML={{ __html: commentEditorScript }} />
  </div>
);
