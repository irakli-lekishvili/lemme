"use client";

import { useBookmarks } from "@/components/providers/bookmarks-provider";
import { useLikes } from "@/components/providers/likes-provider";
import { useReports } from "@/components/providers/reports-provider";
import { ReportModal } from "./report-modal";
import {
  Bookmark,
  Flag,
  Forward,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ImageVariant = "thumbnail" | "medium" | "large" | "xlarge";

// Get optimized image URL with Cloudflare Images variants
function getImageUrl(src: string, id: string | number, variant: ImageVariant = "large"): string {
  if (src.includes("picsum")) {
    return `${src}?random=${id}`;
  }

  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

  // Handle Cloudflare Images URLs
  if (src.includes("imagedelivery.net") && accountHash) {
    const cfMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
    if (cfMatch) {
      return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
    }
  }

  // Legacy: Supabase storage URLs via local proxy
  const match = src.match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
  if (match) {
    return `/api/images/${match[1]}`;
  }

  return src;
}

export type TimelineCategory = {
  name: string;
  slug: string;
  color: string | null;
};

export type TimelineItem = {
  id: string | number;
  src: string;
  likes: number;
  title?: string;
  description?: string;
  user_id?: string;
  short_id?: string;
  categories?: TimelineCategory[];
  created_at?: string;
};

interface TimelineGalleryProps {
  posts: TimelineItem[];
}

export function TimelineGallery({ posts }: TimelineGalleryProps) {
  return (
    <div className="max-w-[470px] mx-auto">
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <TimelinePost key={post.id} post={post} />
        ))}
      </div>

      {/* Load More */}
      {posts.length > 0 && (
        <div className="flex justify-center mt-8 mb-4">
          <button type="button" className="btn btn-secondary px-8 py-3">
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

function TimelinePost({ post }: { post: TimelineItem }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <article className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="avatar w-8 h-8" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary">
              Anonymous
            </span>
            {post.categories && post.categories.length > 0 && (
              <span className="text-xs text-text-muted">
                {post.categories[0].name}
              </span>
            )}
          </div>
        </div>
        <MoreOptionsMenu postId={String(post.id)} />
      </div>

      {/* Image */}
      <div className="relative bg-bg-base aspect-square">
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-bg-hover" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getImageUrl(post.src, post.id, "medium")}
          alt={post.title || `Post ${post.id}`}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LikeButton postId={String(post.id)} />
            <ShareButton postId={post.short_id || String(post.id)} />
          </div>
          <BookmarkButton postId={String(post.id)} />
        </div>
      </div>

      {/* Like Count */}
      <div className="px-4 pt-2">
        <LikeCount postId={String(post.id)} initialLikes={post.likes} />
      </div>

      {/* Caption */}
      {(post.title || post.description) && (
        <div className="px-4 pt-2">
          {post.title && (
            <p className="text-sm text-text-primary">
              <span className="font-semibold">Anonymous</span>{" "}
              <span className="text-text-secondary">{post.title}</span>
            </p>
          )}
          {post.description && (
            <p className="text-sm text-text-muted mt-1">{post.description}</p>
          )}
        </div>
      )}

      {/* Categories as tags */}
      {post.categories && post.categories.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {post.categories.map((cat) => (
            <span
              key={cat.slug}
              className="text-xs text-primary-400 hover:text-primary-300 cursor-pointer"
            >
              #{cat.slug}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div className="px-4 pt-2 pb-4">
        <time className="text-[10px] text-text-muted uppercase tracking-wide">
          {formatTimeAgo(post.created_at)}
        </time>
      </div>
    </article>
  );
}

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function LikeButton({ postId }: { postId: string }) {
  const { isAuthenticated } = useBookmarks();
  const { isLiked, toggleLike } = useLikes();
  const router = useRouter();
  const liked = isLiked(postId);

  return (
    <button
      type="button"
      className="p-1 hover:opacity-70 transition-opacity"
      onClick={() => {
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }
        toggleLike(postId);
      }}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={`w-6 h-6 transition-colors ${
          liked ? "fill-primary-500 text-primary-500" : "text-text-primary"
        }`}
      />
    </button>
  );
}

function LikeCount({
  postId,
  initialLikes,
}: {
  postId: string;
  initialLikes: number;
}) {
  const { getLikeCount } = useLikes();
  const count = getLikeCount(postId, initialLikes);

  if (count === 0) return null;

  return (
    <p className="text-sm font-semibold text-text-primary">
      {count.toLocaleString()} like{count !== 1 ? "s" : ""}
    </p>
  );
}

function BookmarkButton({ postId }: { postId: string }) {
  const { isBookmarked, toggleBookmark, isAuthenticated } = useBookmarks();
  const router = useRouter();
  const bookmarked = isBookmarked(postId);

  return (
    <button
      type="button"
      className="p-1 hover:opacity-70 transition-opacity"
      onClick={() => {
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }
        toggleBookmark(postId);
      }}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
    >
      <Bookmark
        className={`w-6 h-6 transition-colors ${
          bookmarked ? "fill-text-primary text-text-primary" : "text-text-primary"
        }`}
      />
    </button>
  );
}

function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip open={copied}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-1 hover:opacity-70 transition-opacity"
          onClick={handleCopy}
          aria-label="Copy link"
        >
          <Forward className="w-6 h-6 text-text-primary" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Copied!</TooltipContent>
    </Tooltip>
  );
}

function MoreOptionsMenu({ postId }: { postId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { isAuthenticated } = useReports();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleReportClick = () => {
    setIsOpen(false);
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setShowReportModal(true);
  };

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          className="p-1 hover:opacity-70 transition-opacity"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5 text-text-primary" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-lg overflow-hidden z-10 min-w-[140px]">
            <button
              type="button"
              onClick={handleReportClick}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-bg-hover transition-colors"
            >
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>
        )}
      </div>

      <ReportModal
        postId={postId}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </>
  );
}
