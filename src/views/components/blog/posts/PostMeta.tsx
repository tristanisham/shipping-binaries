import type { FC } from "hono/jsx";
import type { PostWithAuthor } from "../../../../models/post.js";
import { formatPublishDate } from "./Pagination.js";
import { PostActions } from "./PostActions.js";

type PostMetaProps = {
  inverse?: boolean;
  post: PostWithAuthor;
};

export const PostMeta: FC<PostMetaProps> = ({ inverse = false, post }) => {
  const displayName = post.authorLabel ?? `@${post.authorUsername}`;
  const href = `/blog/${post.slug}`;

  return (
    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-sm">
      <a
        class="font-semibold hover:underline"
        href={`/@${encodeURIComponent(post.authorUsername)}`}
      >
        {displayName}
      </a>
      <span aria-hidden="true" class="opacity-50">•</span>
      <time
        class={inverse ? "opacity-80" : "opacity-70"}
        datetime={post.createdAt}
      >
        Published {formatPublishDate(post.createdAt)}
      </time>
      <PostActions
        commentCount={post.comments.length}
        displayName={displayName}
        href={href}
        inverse={inverse}
        title={post.title}
      />
    </div>
  );
};
