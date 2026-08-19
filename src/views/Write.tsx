import type { FC } from "hono/jsx";
import {
  formatKeywords,
  MAX_POST_SLUG_LENGTH,
  type Post,
} from "../models/post.js";
import { AdminNav } from "./components/admin/AdminNav.js";
import { AdminTools, AdminToolSection } from "./components/admin/AdminTools.js";
import { EditorJs } from "./components/admin/EditorJs.js";
import { KeywordTagCloud } from "./components/admin/KeywordTagCloud.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button, buttonVariants } from "./components/ui/Button.js";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { Textarea } from "./components/ui/Textarea.js";
import { cn } from "./components/ui/utils.js";
import {
  panelDivider,
  panelField,
  panelOutlineButton,
  panelSurface,
} from "./components/admin/panel.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type WriteProps = {
  post?: Post;
  slugError?: string;
  values?: WriteFormValues;
  viewerUsername?: string;
};

export type WriteFormValues = {
  body: string;
  description: string;
  draft: boolean;
  id: string;
  image: string;
  keywords: string;
  slug: string;
  slugMode: "auto" | "custom";
  title: string;
};

const postSlugScript = `
window.initPostSlugField = (root) => {
  if (root.dataset.slugReady === "true") return;

  const form = root.closest("form");
  const title = form?.querySelector('input[name="title"]');
  const slug = root.querySelector('input[name="slug"]');
  const mode = root.querySelector('input[name="slugMode"]');
  const preview = root.querySelector("[data-slug-preview]");
  const error = root.querySelector("[data-slug-error]");
  const generate = root.querySelector("[data-slug-generate]");
  if (!form || !title || !slug || !mode || !preview || !error) return;

  root.dataset.slugReady = "true";
  let serverMessage = error.textContent.trim();
  let touched = serverMessage.length > 0;

  const slugify = (value) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, ${MAX_POST_SLUG_LENGTH})
      .replace(/-+$/g, "");

  const renderPreview = () => {
    preview.textContent = slug.value || "generated-slug";
  };

  const validate = (showMessage = touched) => {
    let message = "";
    if (slug.value.length === 0) {
      message = "Enter a title or custom slug.";
    } else if (slug.value.length > ${MAX_POST_SLUG_LENGTH}) {
      message = "Keep the slug to ${MAX_POST_SLUG_LENGTH} characters or fewer.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.value)) {
      message = "Use lowercase letters, numbers, and single hyphens only.";
    }

    if (!message && serverMessage) message = serverMessage;

    slug.setCustomValidity(message);
    error.textContent = showMessage ? message : "";
    error.hidden = !showMessage || message.length === 0;
    return message.length === 0;
  };

  title.addEventListener("input", () => {
    if (mode.value !== "auto") return;
    serverMessage = "";
    slug.value = slugify(title.value);
    touched = false;
    renderPreview();
    validate(false);
  });

  slug.addEventListener("input", () => {
    serverMessage = "";
    mode.value = "custom";
    touched = true;
    renderPreview();
    validate(true);
  });

  generate?.addEventListener("click", () => {
    serverMessage = "";
    mode.value = "auto";
    slug.value = slugify(title.value);
    touched = true;
    renderPreview();
    validate(true);
    slug.dispatchEvent(new Event("change", { bubbles: true }));
  });

  slug.addEventListener("invalid", () => {
    touched = true;
    validate(true);
  });

  form.addEventListener("submit", () => {
    touched = true;
    validate(true);
  });

  root.addEventListener("post-slug:resolved", (event) => {
    if (typeof event.detail !== "string") return;
    serverMessage = "";
    slug.value = event.detail;
    renderPreview();
    validate(false);
  });

  root.addEventListener("post-slug:error", (event) => {
    if (typeof event.detail !== "string") return;
    serverMessage = event.detail;
    touched = true;
    validate(true);
  });

  renderPreview();
  validate(touched);
};
`;

const keywordsScript = `
window.initKeywordsField = (root) => {
  if (root.dataset.keywordsReady === "true") return;

  const input = root.querySelector('input[name="keywords"]');
  const cloud = root.querySelector("[data-keywords-cloud]");
  if (!input || !cloud) return;

  root.dataset.keywordsReady = "true";

  const parse = (value) =>
    value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

  const render = () => {
    const keywords = parse(input.value);
    cloud.textContent = "";
    cloud.hidden = keywords.length === 0;

    keywords.forEach((keyword, index) => {
      const tag = document.createElement("button");
      tag.type = "button";
      tag.dataset.index = String(index);
      tag.setAttribute("aria-label", "Remove " + keyword);
      tag.className =
        "flex min-w-0 items-center justify-between gap-1 rounded-md border border-amber-50/25 bg-amber-50/10 px-2 py-1 text-left text-xs font-normal text-amber-50 transition-colors hover:border-burgundy-300 hover:bg-burgundy-500/20 dark:border-mist-600/25 dark:bg-mist-600/10 dark:text-mist-600 dark:hover:border-burgundy-600 dark:hover:bg-burgundy-500/20";

      const label = document.createElement("span");
      label.className = "truncate";
      label.textContent = keyword;

      const remove = document.createElement("span");
      remove.setAttribute("aria-hidden", "true");
      remove.className = "shrink-0 text-sm leading-none opacity-70";
      remove.textContent = "\\u00D7";

      tag.append(label, remove);
      cloud.append(tag);
    });
  };

  cloud.addEventListener("click", (event) => {
    const tag = event.target.closest("button[data-index]");
    if (!tag) return;
    const index = Number(tag.dataset.index);
    const keywords = parse(input.value);
    if (index < 0 || index >= keywords.length) return;
    keywords.splice(index, 1);
    input.value = keywords.join(", ");
    render();
    input.focus();
  });

  input.addEventListener("input", render);
  render();
};
`;

export const Write: FC<WriteProps> = ({
  post,
  slugError,
  values,
  viewerUsername,
}) => {
  const meta: LayoutMeta = {
    title: post ? "Edit post | Shipping Binaries" : "Write | Shipping Binaries",
    robots: "noindex",
    alpine: true,
  };
  const isDraft = values?.draft ?? (post ? post.draft : true);
  const id = values?.id ?? (post ? String(post.id) : "");
  const title = values?.title ?? post?.title ?? "";
  const description = values?.description ?? post?.description ?? "";
  const body = values?.body ?? post?.body ?? "";
  const slug = values?.slug ?? post?.slug ?? "";
  const slugMode = values?.slugMode ?? (post ? "custom" : "auto");
  const keywords = values?.keywords ??
    (post ? formatKeywords(post.keywords) : "");
  const image = values?.image ?? post?.image ?? "";

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin")}
        viewerUsername={viewerUsername}
      />
      <form
        action="/admin/write"
        class="container mx-auto grid min-h-[calc(100vh-5rem)] grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)]"
        method="post"
      >
        <input name="id" type="hidden" value={id} />
        <AdminNav current="/admin/write" />

        <Card class="min-w-0">
          <CardHeader class={`border-b ${panelDivider}`}>
            <CardTitle class="text-2xl" id="post-editor-heading">
              {post ? "Edit post" : "Post editor"}
            </CardTitle>
            <CardDescription>Write and format a post.</CardDescription>
            <CardAction class="flex items-center gap-2">
              {post && post.slug
                ? (
                  <a
                    aria-label="View live post"
                    class={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      panelOutlineButton,
                    )}
                    data-view-live-post
                    href={`/blog/${post.slug}`}
                    title="View live post"
                  >
                    <svg
                      aria-hidden="true"
                      class="size-4 fill-none stroke-current"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                    </svg>
                  </a>
                )
                : null}
              <Button
                aria-label="Import Markdown"
                class={panelOutlineButton}
                data-markdown-import
                size="sm"
                title="Import Markdown"
                type="button"
                variant="outline"
              >
                <svg
                  aria-hidden="true"
                  class="size-4 fill-none stroke-current"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M12 18v-6" />
                  <path d="m9 15 3-3 3 3" />
                </svg>
              </Button>
              <div class="relative" data-markdown-export-menu-root>
                <Button
                  aria-controls="markdown-export-menu"
                  aria-expanded="false"
                  aria-haspopup="menu"
                  aria-label="Export Markdown"
                  class={panelOutlineButton}
                  data-markdown-export
                  size="sm"
                  title="Export Markdown"
                  type="button"
                  variant="outline"
                >
                  <svg
                    aria-hidden="true"
                    class="size-4 fill-none stroke-current"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
                    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
                    <path d="M12 18v-6" />
                    <path d="m9 15 3 3 3-3" />
                  </svg>
                </Button>

                <div
                  aria-label="Export Markdown"
                  class={cn(
                    "absolute top-[calc(100%+0.5rem)] right-0 z-20 flex items-center gap-1 rounded-lg border p-2 shadow-xl",
                    "border-amber-50/25 dark:border-mist-600/25",
                    panelSurface,
                  )}
                  data-markdown-export-menu
                  hidden
                  id="markdown-export-menu"
                  role="group"
                >
                  <Button
                    aria-label="Download Obsidian Markdown"
                    class={panelOutlineButton}
                    data-markdown-export-obsidian
                    size="sm"
                    title="Download Obsidian Markdown"
                    type="button"
                    variant="outline"
                  >
                    {/* Obsidian's four-facet mark, recolored to the panel via
                        currentColor; the two back facets are dimmed so the
                        faceting still reads at 16px. */}
                    <svg
                      aria-hidden="true"
                      class="size-4 fill-current stroke-none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M19.355 18.538a68.967 68.959 0 0 0 1.858-2.954.81.81 0 0 0-.062-.9c-.516-.685-1.504-2.075-2.042-3.362-.553-1.321-.636-3.375-.64-4.377a1.707 1.707 0 0 0-.358-1.05l-3.198-4.064a3.744 3.744 0 0 1-.076.543c-.106.503-.307 1.004-.536 1.5-.134.29-.29.6-.446.914l-.31.626c-.516 1.068-.997 2.227-1.132 3.59-.124 1.26.046 2.73.815 4.481.128.011.257.025.386.044a6.363 6.363 0 0 1 3.326 1.505c.916.79 1.744 1.922 2.415 3.5z"
                        opacity=".65"
                      />
                      <path d="M8.199 22.569c.073.012.146.02.22.02.78.024 2.095.092 3.16.29.87.16 2.593.64 4.01 1.055 1.083.316 2.198-.548 2.355-1.664.114-.814.33-1.735.725-2.58l-.01.005c-.67-1.87-1.522-3.078-2.416-3.849a5.295 5.295 0 0 0-2.778-1.257c-1.54-.216-2.952.19-3.84.45.532 2.218.368 4.829-1.425 7.531z" />
                      <path
                        d="M5.533 9.938c-.023.1-.056.197-.098.29L2.82 16.059a1.602 1.602 0 0 0 .313 1.772l4.116 4.24c2.103-3.101 1.796-6.02.836-8.3-.728-1.73-1.832-3.081-2.55-3.831z"
                        opacity=".65"
                      />
                      <path d="M9.32 14.01c.615-.183 1.606-.465 2.745-.534-.683-1.725-.848-3.233-.716-4.577.154-1.552.7-2.847 1.235-3.95.113-.235.223-.454.328-.664.149-.297.288-.577.419-.86.217-.47.379-.885.46-1.27.08-.38.08-.72-.014-1.043-.095-.325-.297-.675-.68-1.06a1.6 1.6 0 0 0-1.475.36l-4.95 4.452a1.602 1.602 0 0 0-.513.952l-.427 2.83c.672.59 2.328 2.316 3.335 4.711.09.21.175.43.253.653z" />
                    </svg>
                  </Button>
                  <Button
                    aria-label="Download Bear Markdown"
                    class={panelOutlineButton}
                    data-markdown-export-bear
                    size="sm"
                    title="Download Bear Markdown"
                    type="button"
                    variant="outline"
                  >
                    <svg
                      aria-hidden="true"
                      class="size-4 fill-none stroke-current"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="11" cy="4" r="2" />
                      <circle cx="18" cy="8" r="2" />
                      <circle cx="20" cy="16" r="2" />
                      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
                    </svg>
                  </Button>
                  <Button
                    aria-label="Download Markdown with editor data"
                    class={panelOutlineButton}
                    data-markdown-export-editor-data
                    size="sm"
                    title="Download Markdown with editor data"
                    type="button"
                    variant="outline"
                  >
                    <svg
                      aria-hidden="true"
                      class="size-4 fill-none stroke-current"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="m16 19 3 3 3-3" />
                      <path d="M19 16v6" />
                      <path d="M21 12.536V5" />
                      <path d="M3 12A9 3 0 0 0 15.182 14.806" />
                      <path d="M3 5V19A9 3 0 0 0 13.318 21.968" />
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent
            aria-labelledby="post-editor-heading"
            class="flex min-h-[60vh] flex-col gap-5"
          >
            <label class="flex flex-col gap-2 text-sm font-medium">
              Title
              <Input
                class={panelField}
                name="title"
                placeholder="Post title"
                value={title}
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium">
              Description
              <Textarea
                class={cn("resize-y", panelField)}
                name="description"
                placeholder="A one-line summary"
                rows={3}
              >
                {description}
              </Textarea>
            </label>
            <div class="flex grow flex-col gap-2 text-sm font-medium">
              <span>Body</span>
              <EditorJs
                name="body"
                placeholder="Start writing..."
                value={body}
              />
            </div>
          </CardContent>
        </Card>

        <AdminTools title="Tools">
          <AdminToolSection open title="Publishing">
            <div class="flex items-center justify-between">
              <span class="text-sm">Draft</span>
              <label class="cursor-pointer">
                <span class="sr-only">Save as draft</span>
                <input
                  aria-label="Save as draft"
                  checked={isDraft}
                  class="peer sr-only"
                  name="currentDraft"
                  type="checkbox"
                  value="1"
                />
                <span class="relative block h-5 w-9 rounded-full border border-amber-50/40 bg-transparent transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-full after:bg-amber-50 after:transition-transform peer-checked:bg-chocolate-500 peer-checked:after:translate-x-4 dark:border-mist-600/40 dark:after:bg-mist-600 dark:peer-checked:after:bg-amber-50" />
              </label>
            </div>
          </AdminToolSection>
          <AdminToolSection open title="Metadata">
            <div class="flex flex-col gap-4">
              <div
                class="flex flex-col gap-2 text-sm font-medium"
                data-post-slug
                {...{ "x-init": "initPostSlugField($el)" }}
              >
                <div class="flex items-center justify-between gap-2">
                  <label for="post-slug">Slug</label>
                  <Button
                    class={panelOutlineButton}
                    data-slug-generate
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Use title
                  </Button>
                </div>
                <Input
                  aria-describedby="post-slug-help post-slug-error"
                  aria-invalid={slugError ? "true" : undefined}
                  class={panelField}
                  id="post-slug"
                  maxlength={MAX_POST_SLUG_LENGTH}
                  name="slug"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  placeholder="generated-from-title"
                  required
                  value={slug}
                />
                <input name="slugMode" type="hidden" value={slugMode} />
                <span
                  class="text-xs font-normal opacity-70"
                  id="post-slug-help"
                >
                  /blog/<span data-slug-preview>
                    {slug || "generated-slug"}
                  </span>
                </span>
                <span
                  class="text-xs font-normal text-burgundy-300 dark:text-burgundy-600"
                  data-slug-error
                  hidden={!slugError}
                  id="post-slug-error"
                >
                  {slugError ?? ""}
                </span>
              </div>
              <KeywordTagCloud value={keywords} />
            </div>
          </AdminToolSection>
          <AdminToolSection open title="Image">
            <label class="flex flex-col gap-2 text-sm font-medium">
              Image URL
              <Input
                class={panelField}
                name="image"
                placeholder="https://"
                type="url"
                value={image}
              />
            </label>
          </AdminToolSection>
          <AdminToolSection open title="Controls">
            <div class="flex flex-col gap-2">
              <Button
                class={`w-full ${panelOutlineButton}`}
                name="postAction"
                type="submit"
                value="draft"
                variant="outline"
              >
                Save Draft
              </Button>
              <Button
                class="w-full capitalize !text-amber-50"
                name="postAction"
                type="submit"
                value="publish"
                variant="secondary"
              >
                Publish
              </Button>
            </div>
          </AdminToolSection>
        </AdminTools>
        <script dangerouslySetInnerHTML={{ __html: postSlugScript }} />
        <script dangerouslySetInnerHTML={{ __html: keywordsScript }} />
      </form>
    </Layout>
  );
};
