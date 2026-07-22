import type { FC } from "hono/jsx";
import { parseKeywords } from "../../../models/post.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { panelField } from "./panel.js";

type KeywordTagCloudProps = {
  value: string;
};

const keywordButtonClass =
  "rounded-full border border-amber-50/30 bg-amber-50/10 px-2 py-0.5 text-xs font-normal text-amber-50 transition-colors hover:bg-amber-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-50/60 dark:border-mist-600/30 dark:bg-mist-600/10 dark:text-mist-600 dark:hover:bg-mist-600/20 dark:focus-visible:ring-mist-600/60";

const keywordTagCloudScript = `
window.initKeywordTagCloud = (root) => {
  if (root.dataset.keywordCloudReady === "true") return;

  const input = root.querySelector('input[name="keywords"]');
  const entry = root.querySelector("[data-keyword-entry]");
  const addButton = root.querySelector("[data-keyword-add]");
  const cloud = root.querySelector("[data-keyword-cloud]");
  if (!input || !entry || !addButton || !cloud) return;

  root.dataset.keywordCloudReady = "true";

  const parse = (value) =>
    value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);

  const render = () => {
    const keywords = parse(input.value);
    const tags = keywords.map((keyword, index) => {
      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = ${JSON.stringify(keywordButtonClass)};
      tag.textContent = keyword;
      tag.title = "Remove " + keyword;
      tag.setAttribute("aria-label", "Remove keyword " + keyword);
      tag.addEventListener("click", () => {
        const currentKeywords = parse(input.value);
        currentKeywords.splice(index, 1);
        input.value = currentKeywords.join(", ");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        entry.focus();
      });
      return tag;
    });

    cloud.replaceChildren(...tags);
  };

  const addKeywords = () => {
    const additions = parse(entry.value);
    if (additions.length === 0) {
      entry.focus();
      return;
    }

    const keywords = parse(input.value);
    const existing = new Set(keywords.map((keyword) => keyword.toLowerCase()));
    additions.forEach((keyword) => {
      const normalized = keyword.toLowerCase();
      if (existing.has(normalized)) return;
      existing.add(normalized);
      keywords.push(keyword);
    });

    input.value = keywords.join(", ");
    entry.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    entry.focus();
  };

  input.addEventListener("input", render);
  addButton.addEventListener("click", addKeywords);
  entry.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addKeywords();
  });
  render();
};
`;

export const KeywordTagCloud: FC<KeywordTagCloudProps> = ({ value }) => {
  const keywords = parseKeywords(value);

  return (
    <div
      class="flex flex-col gap-2 text-sm font-medium"
      data-keyword-tag-cloud
      {...{ "x-init": "initKeywordTagCloud($el)" }}
    >
      <label for="post-keywords">Keywords</label>
      <div
        aria-label="Current keywords"
        aria-live="polite"
        class="flex min-h-6 flex-wrap items-center gap-1.5"
        data-keyword-cloud
      >
        {keywords.map((keyword) => (
          <button
            aria-label={`Remove keyword ${keyword}`}
            class={keywordButtonClass}
            title={`Remove ${keyword}`}
            type="button"
          >
            {keyword}
          </button>
        ))}
      </div>
      <input name="keywords" type="hidden" value={value} />
      <div aria-label="Add keyword" class="flex gap-2" role="group">
        <Input
          aria-describedby="post-keywords-help"
          class={`min-w-0 grow ${panelField}`}
          data-keyword-entry
          id="post-keywords"
          placeholder="Keyword"
        />
        <Button
          aria-label="Add keyword"
          class="size-8 px-0 !text-amber-50"
          data-keyword-add
          size="sm"
          title="Add keyword"
          type="button"
          variant="secondary"
        >
          <svg
            aria-hidden="true"
            class="size-4 fill-none stroke-current"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </Button>
      </div>
      <span class="text-xs font-normal opacity-70" id="post-keywords-help">
        Click on a tag to remove it
      </span>
      <script dangerouslySetInnerHTML={{ __html: keywordTagCloudScript }} />
    </div>
  );
};
