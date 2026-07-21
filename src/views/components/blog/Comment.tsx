import type { FC } from "hono/jsx";
import type { BlogComment } from "../../../models/comment.js";

type CommentProps = {
  comment: BlogComment;
};

export const Comment: FC<CommentProps> = ({ comment }) => {
  return (
    <article class="border-l-2 border-mist-600/30 pl-4 dark:border-amber-50/30">
      <header class="flex items-baseline gap-2">
        <span class="font-bold">{comment.author}</span>
        <time class="text-sm opacity-70" datetime={comment.createdAt}>
          {comment.createdAt}
        </time>
      </header>
      <p class="mt-2 whitespace-pre-wrap">{comment.content}</p>
      {comment.children.length > 0 && (
        <div class="mt-4 space-y-4">
          {comment.children.map((child) => (
            <Comment comment={child} />
          ))}
        </div>
      )}
    </article>
  );
};
