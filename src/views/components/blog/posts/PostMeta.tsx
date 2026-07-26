import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { formatPublishDate } from "./Pagination.js";
import { PostActions } from "./PostActions.js";

type PostMetaProps = {
  canEdit?: boolean;
  inverse?: boolean;
  post: PostWithAuthor;
  showRead?: boolean;
  showTextSize?: boolean;
};

export const PostMeta: FC<PostMetaProps> = ({
  canEdit = false,
  inverse = false,
  post,
  showRead = true,
  showTextSize = false,
}) => {
  const displayName = post.authorLabel ?? `@${post.authorUsername}`;
  const href = `/blog/${post.slug}`;

  return (
    <div
      class="mt-3 flex items-center gap-x-3 text-left text-sm"
      data-post-meta
    >
      {/* Truncates rather than wraps, keeping the actions on the same row and
          right-aligned across from it. PostActionsFitScript drops buttons while
          this is truncating, so it only actually clips once they are gone. */}
      <div class="min-w-0 flex-1 truncate" data-post-byline>
        <a
          class="font-semibold hover:underline"
          href={`/@${encodeURIComponent(post.authorUsername)}`}
        >
          {displayName}
        </a>
        <span aria-hidden="true" class="mx-2 opacity-50">•</span>
        <time
          class={inverse ? "opacity-80" : "opacity-70"}
          datetime={post.createdAt}
        >
          {/* First rung of the drop ladder: redundant next to the date itself,
              so it goes before any action button does. */}
          <span data-drop-order="0">Published{" "}</span>
          {formatPublishDate(post.createdAt)}
        </time>
      </div>
      <PostActions
        commentCount={post.comments.length}
        editHref={canEdit ? `/admin/write?id=${post.id}` : undefined}
        href={href}
        inverse={inverse}
        showRead={showRead}
        showTextSize={showTextSize}
        title={post.title}
      />
    </div>
  );
};
