"use client";

import { Grid3X3, SquareStack } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ViewToggle() {
  const pathname = usePathname();
  const isGridView = pathname === "/" || pathname.startsWith("/?");
  const isFeedView = pathname === "/feed" || pathname.startsWith("/feed?");

  return (
    <div className="flex items-center bg-bg-elevated rounded-lg p-1">
      <Link
        href="/"
        className={`p-2 rounded-md transition-colors ${
          isGridView
            ? "bg-bg-hover text-text-primary"
            : "text-text-muted hover:text-text-primary"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <Grid3X3 className="w-4 h-4" />
      </Link>
      <Link
        href="/feed"
        className={`p-2 rounded-md transition-colors ${
          isFeedView
            ? "bg-bg-hover text-text-primary"
            : "text-text-muted hover:text-text-primary"
        }`}
        aria-label="Feed view"
        title="Feed view"
      >
        <SquareStack className="w-4 h-4" />
      </Link>
    </div>
  );
}
