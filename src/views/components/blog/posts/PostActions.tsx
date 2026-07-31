import type { FC } from "hono/jsx";
import { AArrowDownIcon } from "../../icons/AArrowDownIcon.js";
import { AArrowUpIcon } from "../../icons/AArrowUpIcon.js";
import { EditIcon } from "../../icons/EditIcon.js";
import { SITE_ORIGIN } from "../../SocialMeta.js";
import { buttonVariants } from "../../ui/Button.js";
import { cn } from "../../ui/utils.js";

type PostActionsProps = {
  commentCount: number;
  editHref?: string;
  href: string;
  inverse?: boolean;
  showRead?: boolean;
  // Text size controls only make sense where the post body is rendered.
  showTextSize?: boolean;
  title: string;
};

const stepTextSize = (direction: 1 | -1): string =>
  `window.stepPostFontScale(${direction})`;

// The server already knows the canonical origin, so the absolute URL is baked
// into the handler — the browser only has to hand it to the clipboard.
// JSON.stringify supplies the quoting: the browser decodes HTML entities before
// parsing the attribute as JS, so entity-escaping alone would not keep a quote
// in the URL from breaking out of the string.
const copyLink = (url: string): string =>
  `window.copyWithToast(${JSON.stringify(url)},'Link copied!')`;

const commentCountFormatter = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  maximumFractionDigits: 1,
  notation: "compact",
});

export const formatCommentCount = (count: number): string =>
  commentCountFormatter.format(Math.max(0, Math.floor(count))).toLowerCase();

export const PostActions: FC<PostActionsProps> = ({
  commentCount,
  editHref,
  href,
  inverse = false,
  showRead = true,
  showTextSize = false,
  title,
}) => {
  const buttonClass = inverse
    ? "inline-flex size-8 items-center justify-center rounded-md border border-amber-50/40 text-amber-50 hover:bg-amber-50/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-50"
    : "inline-flex size-8 items-center justify-center rounded-md border border-mist-600/30 text-mist-600 hover:bg-mist-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mist-600 dark:border-amber-50/30 dark:text-amber-50 dark:hover:bg-amber-50/10 dark:focus-visible:ring-amber-50";

  return (
    <div
      class="relative ml-auto flex shrink-0 items-center gap-2"
      data-post-actions
    >
      {showTextSize
        ? (
          <>
            <button
              aria-label="Decrease text size"
              class={buttonClass}
              onclick={stepTextSize(-1)}
              title="Decrease text size"
              type="button"
            >
              <AArrowDownIcon />
            </button>
            <button
              aria-label="Increase text size"
              class={buttonClass}
              onclick={stepTextSize(1)}
              title="Increase text size"
              type="button"
            >
              <AArrowUpIcon />
            </button>
          </>
        )
        : null}
      <button
        aria-label={`Copy link to ${title}`}
        class={buttonClass}
        data-drop-order="2"
        onclick={copyLink(`${SITE_ORIGIN}${href}`)}
        title="Copy link"
        type="button"
      >
        <svg
          aria-hidden="true"
          class="size-4 fill-none stroke-current"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4" />
          <path d="m8.6 13.5 6.8 4" />
        </svg>
      </button>
      <a
        aria-label={`${commentCount} ${
          commentCount === 1 ? "comment" : "comments"
        } on ${title}`}
        class={`${buttonClass} min-w-8 !w-auto gap-1.5 px-2`}
        data-drop-order="3"
        href={`${href}#comments`}
        title={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
      >
        <svg
          aria-hidden="true"
          class="size-4 fill-none stroke-current"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
          <path d="M8 8h8" />
          <path d="M8 12h6" />
        </svg>
        <span class="text-xs tabular-nums">
          {formatCommentCount(commentCount)}
        </span>
      </a>
      {showRead
        ? (
          <a
            aria-label={`Read ${title}`}
            // Hidden on mobile: the card title already links to the post, so
            // Read is the first thing to drop when the row runs out of width.
            class={cn(
              buttonVariants({ size: "sm", variant: "tertiary" }),
              "hidden sm:inline-flex",
            )}
            data-drop-order="1"
            href={href}
            title="Read"
          >
            <svg
              aria-hidden="true"
              class="size-4 fill-none stroke-current"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 7v14" />
              <path d="M3 18a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h5a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3Z" />
              <path d="M21 18a1 1 0 0 0 1-1V5a2 2 0 0 0-2-2h-5a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3Z" />
              <path d="M6 8h2" />
              <path d="M6 12h2" />
              <path d="M16 8h2" />
              <path d="M16 12h2" />
            </svg>
            {editHref ? null : <span>Read</span>}
          </a>
        )
        : null}
      {editHref
        ? (
          <a
            aria-label={`Edit ${title}`}
            class={buttonVariants({ size: "sm", variant: "tertiary" })}
            href={editHref}
            title="Edit"
          >
            <EditIcon />
            <span>Edit</span>
          </a>
        )
        : null}
    </div>
  );
};
