import type { FC } from "hono/jsx";
import { buttonVariants } from "../../ui/Button.js";

type PostActionsProps = {
  commentCount: number;
  displayName: string;
  editHref?: string;
  href: string;
  inverse?: boolean;
  showRead?: boolean;
  title: string;
};

const sharePost = [
  "var button=this;",
  "var url=new URL(button.dataset.sharePath,window.location.origin).href;",
  "var text='I just finished reading '+button.dataset.shareTitle+' by '+button.dataset.shareAuthor+' on Shipping Binaries';",
  "var message=text+'\\n\\n'+url;",
  "var status=button.parentElement.querySelector('[data-share-status]');",
  "var report=function(value){status.textContent=value;window.setTimeout(function(){status.textContent=''},2000)};",
  "var copy=function(){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(message).then(function(){button.title='Message copied';report('Copied')},function(){report('Copy failed');window.prompt('Copy this share message:',message)})}else{report('Copy unavailable');window.prompt('Copy this share message:',message)}};",
  "var data={title:button.dataset.shareTitle,text:text,url:url};",
  "var canNativeShare=false;try{canNativeShare=Boolean(navigator.share)&&(!navigator.canShare||navigator.canShare(data))}catch(error){}",
  "if(canNativeShare){navigator.share(data).catch(function(error){if(!error||error.name!=='AbortError'){copy()}})}else{copy()}",
].join("");

const commentCountFormatter = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  maximumFractionDigits: 1,
  notation: "compact",
});

export const formatCommentCount = (count: number): string =>
  commentCountFormatter.format(Math.max(0, Math.floor(count))).toLowerCase();

export const PostActions: FC<PostActionsProps> = ({
  commentCount,
  displayName,
  editHref,
  href,
  inverse = false,
  showRead = true,
  title,
}) => {
  const buttonClass = inverse
    ? "inline-flex size-8 items-center justify-center rounded-md border border-amber-50/40 text-amber-50 hover:bg-amber-50/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-50"
    : "inline-flex size-8 items-center justify-center rounded-md border border-mist-600/30 text-mist-600 hover:bg-mist-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mist-600 dark:border-amber-50/30 dark:text-amber-50 dark:hover:bg-amber-50/10 dark:focus-visible:ring-amber-50";

  return (
    <div class="relative ml-auto flex shrink-0 items-center gap-2">
      {editHref
        ? (
          <a
            aria-label={`Edit ${title}`}
            class={buttonVariants({ size: "sm", variant: "tertiary" })}
            href={editHref}
            title="Edit"
          >
            <svg
              aria-hidden="true"
              class="size-4 fill-none stroke-current"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>Edit</span>
          </a>
        )
        : null}
      <button
        aria-label={`Share ${title}`}
        class={buttonClass}
        onclick={sharePost}
        title="Share"
        type="button"
        {...{
          "data-share-author": displayName,
          "data-share-path": href,
          "data-share-title": title,
        }}
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
      <span
        aria-live="polite"
        class="pointer-events-none absolute top-full right-0 mt-1 whitespace-nowrap text-xs font-semibold text-chocolate-500"
        data-share-status
      />
      <a
        aria-label={`${commentCount} ${
          commentCount === 1 ? "comment" : "comments"
        } on ${title}`}
        class={`${buttonClass} min-w-8 !w-auto gap-1.5 px-2`}
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
            class={buttonVariants({ size: "sm", variant: "tertiary" })}
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
            <span>Read</span>
          </a>
        )
        : null}
    </div>
  );
};
