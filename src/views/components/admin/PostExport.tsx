import type { FC } from "hono/jsx";
import { Button } from "../ui/Button.js";
import { FileDownIcon } from "../icons/FileDownIcon.js";
import {
  panelField,
  panelMuted,
  panelOutlineButton,
  panelSurface,
} from "./panel.js";

// Opens the export dialog. Defined by PostExportDialog's script, which is
// rendered on the same page.
export const PostExportButton: FC = () => (
  <Button
    aria-haspopup="dialog"
    aria-label="Export posts"
    class={panelOutlineButton}
    data-post-export-open
    onclick="window.openPostExport()"
    size="sm"
    title="Export posts"
    type="button"
    variant="outline"
  >
    <FileDownIcon />
  </Button>
);

type ExportChoice = {
  hint: string;
  label: string;
  value: string;
};

const scopeChoices: readonly ExportChoice[] = [
  { hint: "Drafts and published posts", label: "All posts", value: "all" },
  { hint: "Drafts only", label: "Private", value: "private" },
  { hint: "Published only", label: "Public", value: "public" },
];

const formatChoices: readonly ExportChoice[] = [
  { hint: "Widest support", label: "Zip", value: "zip" },
  { hint: "Smaller download", label: "Tar.gz", value: "targz" },
];

// Only the admin role sees this fieldset, and the server ignores the
// parameter it sets for anyone else.
const authorChoices: readonly ExportChoice[] = [
  { hint: "Only yours", label: "My posts", value: "mine" },
  { hint: "Everyone's posts", label: "All authors", value: "all" },
  { hint: "Pick from the list", label: "Specific authors", value: "list" },
];

export type PostExportAuthorOption = {
  id: number;
  username: string;
};

// The authors of the posts on the page: no extra query, and only people who
// actually have posts to export.
export const postExportAuthorOptions = (
  posts: readonly { authorUsername: string; userId: number }[],
): PostExportAuthorOption[] => {
  const authors = new Map<number, string>();
  for (const post of posts) authors.set(post.userId, post.authorUsername);

  return [...authors]
    .map(([id, username]) => ({ id, username }))
    .sort((left, right) => left.username.localeCompare(right.username));
};

const ChoiceField: FC<{
  choices: readonly ExportChoice[];
  legend: string;
  name: string;
}> = ({ choices, legend, name }) => (
  <fieldset class="mt-4">
    <legend class="text-sm font-medium">{legend}</legend>
    <div class="mt-2 flex flex-col gap-2">
      {choices.map((choice, index) => (
        <label class="flex cursor-pointer items-baseline gap-2 text-sm">
          <input
            checked={index === 0}
            class="accent-chocolate-500"
            name={name}
            type="radio"
            value={choice.value}
          />
          <span>{choice.label}</span>
          <span class={`text-xs ${panelMuted}`}>{choice.hint}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

// Kept free of template literals so it survives the JSX template literal it is
// embedded in.
const postExportScript = `
(() => {
  const dialog = document.querySelector("[data-post-export-dialog]");
  if (!dialog) return;

  const status = dialog.querySelector("[data-post-export-status]");
  const download = dialog.querySelector("[data-post-export-download]");
  const cancel = dialog.querySelector("[data-post-export-cancel]");
  const authorField = dialog.querySelector("[data-post-export-author-field]");
  const authorSelect = dialog.querySelector("[data-post-export-authors]");
  let opener = null;
  let busy = false;

  const checked = (name) => {
    const input = dialog.querySelector(
      'input[name="' + name + '"]:checked',
    );
    return input ? input.value : "";
  };

  const say = (message) => {
    if (status) status.textContent = message;
  };

  window.openPostExport = () => {
    opener = document.activeElement;
    say("");
    dialog.showModal();
    const first = dialog.querySelector('input[type="radio"]:checked');
    if (first) first.focus();
  };

  // Escape closes a native dialog on its own; restore focus either way.
  dialog.addEventListener("close", () => {
    if (opener && typeof opener.focus === "function") opener.focus();
    opener = null;
  });

  cancel?.addEventListener("click", () => dialog.close());

  // The author list only applies to "Specific authors". Disabling it as well
  // as hiding it keeps it out of the tab order and out of the request.
  const syncAuthorField = (announce) => {
    if (!authorField || !authorSelect) return;
    const chooser = dialog.querySelector(
      'input[name="post-export-authors"][value="list"]',
    );
    const open = Boolean(chooser && chooser.checked);
    authorField.hidden = !open;
    authorSelect.disabled = !open;
    if (!announce) return;
    say(open ? "Choose the authors to export." : "");
    if (open) authorSelect.focus();
  };

  dialog.querySelectorAll('input[name="post-export-authors"]').forEach(
    (radio) => radio.addEventListener("change", () => syncAuthorField(true)),
  );
  syncAuthorField(false);

  const suggestedName = (scope, format) => {
    const day = new Date().toISOString().slice(0, 10);
    return "shipping-binaries-posts-" + scope + "-" + day +
      (format === "targz" ? ".tar.gz" : ".zip");
  };

  const pickerTypes = (format) =>
    format === "targz"
      ? [{
        description: "Gzipped tar archive",
        accept: { "application/gzip": [".tar.gz", ".tgz"] },
      }]
      : [{
        description: "Zip archive",
        accept: { "application/zip": [".zip"] },
      }];

  const saveWithAnchor = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = name;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  download?.addEventListener("click", async () => {
    if (busy) return;
    const scope = checked("post-export-scope") || "all";
    const format = checked("post-export-format") || "zip";
    const name = suggestedName(scope, format);

    // Absent for a non-admin, and ignored by the server in that case anyway.
    let authors = checked("post-export-authors") || "mine";
    if (authors === "list") {
      const chosen = authorSelect
        ? Array.from(authorSelect.selectedOptions).map((option) => option.value)
        : [];
      if (chosen.length === 0) {
        say("Choose at least one author.");
        authorSelect?.focus();
        return;
      }
      authors = chosen.join(",");
    }

    // The picker needs the click's user activation, so ask for the file
    // before the request rather than after it.
    let handle = null;
    if (typeof window.showSaveFilePicker === "function") {
      try {
        handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: pickerTypes(format),
        });
      } catch (error) {
        if (error && error.name === "AbortError") {
          say("Export cancelled.");
          return;
        }
        handle = null;
      }
    }

    busy = true;
    download.disabled = true;
    say("Preparing " + name + "...");

    try {
      const response = await fetch(
        "/admin/posts/export?scope=" + encodeURIComponent(scope) +
          "&format=" + encodeURIComponent(format) +
          "&authors=" + encodeURIComponent(authors),
        { credentials: "same-origin" },
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();

      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        saveWithAnchor(blob, name);
      }

      say("Saved " + name + ".");
      dialog.close();
    } catch (error) {
      say("Export failed. Try again.");
    } finally {
      busy = false;
      download.disabled = false;
    }
  });
})();
`;

type PostExportDialogProps = {
  authors: readonly PostExportAuthorOption[];
  isAdmin: boolean;
  viewerId?: number;
};

export const PostExportDialog: FC<PostExportDialogProps> = ({
  authors,
  isAdmin,
  viewerId,
}) => (
  <>
    <dialog
      aria-labelledby="post-export-title"
      class={`m-auto w-full max-w-md rounded-xl border p-6 backdrop:bg-onyx-950/70 ${panelSurface}`}
      data-post-export-dialog
    >
      <h2 class="text-xl font-semibold" id="post-export-title">
        Export posts
      </h2>
      <p class={`mt-2 text-sm ${panelMuted}`}>
        Downloads one Markdown file per post, with frontmatter, in an archive.
      </p>
      <ChoiceField
        choices={scopeChoices}
        legend="Which posts"
        name="post-export-scope"
      />
      {isAdmin && authors.length > 0
        ? (
          <>
            <ChoiceField
              choices={authorChoices}
              legend="Whose posts"
              name="post-export-authors"
            />
            <div class="mt-2" data-post-export-author-field hidden>
              <label
                class="flex flex-col gap-1 text-sm font-medium"
                for="post-export-author-list"
              >
                Authors
                <select
                  class={`rounded-md border p-2 text-sm ${panelField}`}
                  data-post-export-authors
                  disabled
                  id="post-export-author-list"
                  multiple
                  size={Math.min(6, authors.length)}
                >
                  {authors.map((author) => (
                    <option value={String(author.id)}>
                      {author.id === viewerId
                        ? `${author.username} (you)`
                        : author.username}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )
        : null}
      <ChoiceField
        choices={formatChoices}
        legend="Compression"
        name="post-export-format"
      />
      <p
        aria-live="polite"
        class={`mt-4 min-h-5 text-sm ${panelMuted}`}
        data-post-export-status
        role="status"
      />
      <div class="mt-4 flex justify-end gap-2">
        <Button
          class={panelOutlineButton}
          data-post-export-cancel
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          class="capitalize !text-amber-50"
          data-post-export-download
          size="sm"
          type="button"
          variant="secondary"
        >
          Download
        </Button>
      </div>
    </dialog>
    <script dangerouslySetInnerHTML={{ __html: postExportScript }} />
  </>
);
