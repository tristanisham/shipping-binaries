import type { FC } from "hono/jsx";
import { toIsoTimestamp } from "../../date.js";

type PaginationProps = {
  basePath: string;
  currentPage: number;
  totalPages: number;
};

export const normalizePage = (page: number): number =>
  Number.isInteger(page) && page > 0 ? page : 1;

export const paginate = <T,>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): { currentPage: number; items: readonly T[]; totalPages: number } => {
  const normalizedPageSize = Number.isInteger(pageSize) && pageSize > 0
    ? pageSize
    : 1;
  const totalPages = Math.max(1, Math.ceil(items.length / normalizedPageSize));
  const currentPage = Math.min(normalizePage(requestedPage), totalPages);
  const start = (currentPage - 1) * normalizedPageSize;
  return {
    currentPage,
    items: items.slice(start, start + normalizedPageSize),
    totalPages,
  };
};

export const paginateNewest = <T extends { createdAt: string }>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
) =>
  paginate(
    [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    requestedPage,
    pageSize,
  );

const pageHref = (basePath: string, page: number): string =>
  page === 1 ? basePath : `${basePath}?page=${page}`;

export const Pagination: FC<PaginationProps> = ({
  basePath,
  currentPage,
  totalPages,
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Post pages"
      class="mt-10 flex items-center justify-center gap-2"
    >
      {currentPage > 1
        ? (
          <a
            class="rounded-md border border-mist-600/30 px-3 py-2 hover:bg-mist-600 hover:text-amber-50 dark:border-amber-50/30 dark:hover:bg-amber-50 dark:hover:text-mist-600"
            href={pageHref(basePath, currentPage - 1)}
            rel="prev"
          >
            Previous
          </a>
        )
        : null}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (page) => (
          <a
            aria-current={page === currentPage ? "page" : undefined}
            class={page === currentPage
              ? "rounded-md bg-mist-600 px-3 py-2 font-bold text-amber-50 dark:bg-amber-50 dark:text-mist-600"
              : "rounded-md border border-mist-600/30 px-3 py-2 hover:bg-mist-600 hover:text-amber-50 dark:border-amber-50/30 dark:hover:bg-amber-50 dark:hover:text-mist-600"}
            href={pageHref(basePath, page)}
          >
            {page}
          </a>
        ),
      )}
      {currentPage < totalPages
        ? (
          <a
            class="rounded-md border border-mist-600/30 px-3 py-2 hover:bg-mist-600 hover:text-amber-50 dark:border-amber-50/30 dark:hover:bg-amber-50 dark:hover:text-mist-600"
            href={pageHref(basePath, currentPage + 1)}
            rel="next"
          >
            Next
          </a>
        )
        : null}
    </nav>
  );
};

const publishDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "America/New_York",
  year: "numeric",
});

export const formatPublishDate = (value: string): string => {
  const isoValue = toIsoTimestamp(value);
  if (!isoValue) return value;

  return publishDateFormatter.format(new Date(isoValue));
};
