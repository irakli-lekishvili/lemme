"use client";

import { Grid3X3, List, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PostsToolbarProps {
  totalPosts: number;
  pageSize: number;
}

export function PostsToolbar({ totalPosts, pageSize }: PostsToolbarProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "grid";
  const page = Number(searchParams.get("page") || "1");
  const totalPages = Math.max(1, Math.ceil(totalPosts / pageSize));

  function buildUrl(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      sp.set(key, value);
    }
    return `/admin/posts?${sp.toString()}`;
  }

  return (
    <div className="flex items-center gap-3">
      {/* View toggle */}
      <div className="flex items-center bg-bg-elevated rounded-lg p-1">
        <Link
          href={buildUrl({ view: "grid", page: "1" })}
          className={`p-2 rounded-md transition-colors ${
            view === "grid"
              ? "bg-bg-hover text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
          aria-label="Grid view"
          title="Grid view"
        >
          <Grid3X3 className="w-4 h-4" />
        </Link>
        <Link
          href={buildUrl({ view: "list", page: "1" })}
          className={`p-2 rounded-md transition-colors ${
            view === "list"
              ? "bg-bg-hover text-text-primary"
              : "text-text-muted hover:text-text-primary"
          }`}
          aria-label="List view"
          title="List view"
        >
          <List className="w-4 h-4" />
        </Link>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Link
            href={buildUrl({ page: String(Math.max(1, page - 1)) })}
            className={`p-2 rounded-lg transition-colors ${
              page <= 1
                ? "text-text-disabled pointer-events-none"
                : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
            }`}
            aria-label="Previous page"
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>

          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span
                key={`ellipsis-${i}`}
                className="w-8 text-center text-text-disabled text-sm"
              >
                ...
              </span>
            ) : (
              <Link
                key={p}
                href={buildUrl({ page: String(p) })}
                className={`min-w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                {p}
              </Link>
            )
          )}

          <Link
            href={buildUrl({ page: String(Math.min(totalPages, page + 1)) })}
            className={`p-2 rounded-lg transition-colors ${
              page >= totalPages
                ? "text-text-disabled pointer-events-none"
                : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
            }`}
            aria-label="Next page"
            aria-disabled={page >= totalPages}
            tabIndex={page >= totalPages ? -1 : undefined}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");

  pages.push(total);

  return pages;
}
