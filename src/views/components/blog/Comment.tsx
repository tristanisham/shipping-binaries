import type { FC } from "hono/jsx";
import type { BlogComment } from "../../../models/comment.js";
import { toIsoTimestamp } from "../SocialMeta.js";
import { PostBody } from "./PostBody.js";

type CommentProps = {
  canReply?: boolean;
  comment: BlogComment;
  postSlug: string;
};

const commentDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "America/New_York",
  year: "numeric",
});

export const formatCommentDate = (value: string): string => {
  const iso = toIsoTimestamp(value);
  return iso ? commentDateFormatter.format(new Date(iso)) : value;
};

const commentActionClass =
  "cursor-pointer border-0 bg-transparent p-0 text-sm font-bold text-current hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chocolate-500";

const commentShareScript = [
  "var url=new URL(this.dataset.commentPath,window.location.origin).href;",
  "window.copyWithToast(url,'Comment link copied');",
].join("");

export const Comment: FC<CommentProps> = ({
  canReply = false,
  comment,
  postSlug,
}) => {
  const commentPath = `/blog/${postSlug}#comment-${comment.id}`;
  const wasUpdated = comment.updatedAt !== comment.createdAt;

  return (
    <article class="scroll-mt-6" id={`comment-${comment.id}`}>
      <header class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {comment.authorUsername
          ? (
            <a
              class="font-bold hover:underline"
              href={`/@${encodeURIComponent(comment.authorUsername)}`}
            >
              {comment.displayName}
            </a>
          )
          : <span class="font-bold">{comment.displayName}</span>}
        <time class="text-sm opacity-70" datetime={comment.createdAt}>
          {formatCommentDate(comment.createdAt)}
        </time>
        {wasUpdated
          ? (
            <>
              <span aria-hidden="true" class="text-sm opacity-50">•</span>
              <time class="text-sm opacity-70" datetime={comment.updatedAt}>
                {formatCommentDate(comment.updatedAt)}
              </time>
            </>
          )
          : null}
      </header>
      <div class="mt-2">
        <PostBody body={comment.content} />
      </div>
      <div
        aria-label={`Actions for ${comment.displayName}'s comment`}
        class="mt-2 flex items-center gap-3"
      >
        <button
          aria-label="Upvote comment"
          class={commentActionClass}
          title="Upvote"
          type="button"
        >
          ↑
        </button>
        <button
          aria-label="Downvote comment"
          class={commentActionClass}
          title="Downvote"
          type="button"
        >
          ↓
        </button>
        {canReply
          ? (
            <button
              class={commentActionClass}
              onclick={`window.replyToComment(${comment.id}, ${
                JSON.stringify(comment.displayName)
              })`}
              type="button"
            >
              Reply
            </button>
          )
          : null}
        <button
          class={commentActionClass}
          data-comment-path={commentPath}
          onclick={commentShareScript}
          type="button"
        >
          Share
        </button>
      </div>
      {comment.children.length > 0 && (
        <div class="mt-4 ml-6 space-y-4">
          {comment.children.map((child) => (
            <Comment
              canReply={canReply}
              comment={child}
              postSlug={postSlug}
            />
          ))}
        </div>
      )}
    </article>
  );
};
