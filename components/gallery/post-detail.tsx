"use client";

import { useBookmarks } from "@/components/providers/bookmarks-provider";
import { useLikes } from "@/components/providers/likes-provider";
import { useReports } from "@/components/providers/reports-provider";
import { ReportModal } from "./report-modal";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bookmark,
  Flag,
  Forward,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ImageVariant = "thumbnail" | "medium" | "large" | "xlarge";

// Get optimized image URL with Cloudflare Images variants
function getImageUrl(src: string, id: string, variant: ImageVariant = "large"): string {
  if (src.includes("picsum")) {
    return `${src}?random=${id}`;
  }

  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) return src;

  // Extract Cloudflare image ID and build delivery URL with variant
  const cfMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  if (cfMatch) {
    return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
  }

  return src;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

type PostData = {
  id: string;
  image_url: string;
  likes_count: number;
  title: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  short_id: string | null;
  media_type?: "image" | "video" | "gif" | null;
  thumbnail_url?: string | null;
};

interface PostDetailProps {
  post: PostData;
}

export function PostDetail({ post }: PostDetailProps) {
  const isVideo = post.media_type === "video";

  // Get the video URL for playback
  const getVideoUrl = () => {
    const streamSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN;
    if (!streamSubdomain) return post.image_url;

    // Extract video ID from the URL if it's a Cloudflare Stream URL
    const match = post.image_url.match(/cloudflarestream\.com\/([^/]+)/);
    if (match) {
      return `https://customer-${streamSubdomain}.cloudflarestream.com/${match[1]}/manifest/video.m3u8`;
    }
    return post.image_url;
  };

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-xl overflow-hidden">
      {/* Desktop layout: side by side */}
      <div className="flex flex-col md:flex-row">
        {/* Media */}
        <div className="bg-bg-base md:flex-1 md:max-w-[600px]">
          {isVideo ? (
            <video
              src={getVideoUrl()}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(post.image_url, post.id, "large")}
              alt={post.title || `Post ${post.id}`}
              className="w-full h-auto object-contain"
            />
          )}
        </div>

        {/* Details sidebar */}
        <div className="md:w-[335px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="avatar w-8 h-8" />
              <span className="text-sm font-semibold text-text-primary">
                Anonymous
              </span>
            </div>
            <MoreOptionsMenu postId={post.id} />
          </div>

          {/* Content area */}
          <div className="flex-1 px-4 py-4 overflow-y-auto">
            {/* Caption */}
            {(post.title || post.description) && (
              <div className="mb-4">
                {post.title && (
                  <p className="text-sm text-text-primary mb-1">
                    <span className="font-semibold">Anonymous</span>{" "}
                    <span>{post.title}</span>
                  </p>
                )}
                {post.description && (
                  <p className="text-sm text-text-secondary">{post.description}</p>
                )}
              </div>
            )}

            {/* Date */}
            <p className="text-xs text-text-muted">
              {formatDate(post.created_at)}
            </p>
          </div>

          {/* Actions */}
          <div className="border-t border-border-subtle">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <LikeButton postId={post.id} />
                  <ShareButton postId={post.short_id || post.id} />
                </div>
                <BookmarkButton postId={post.id} />
              </div>
            </div>

            {/* Like count */}
            <div className="px-4 pb-4">
              <LikeCount postId={post.id} initialLikes={post.likes_count} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
