"use client";

import { useBookmarks } from "@/components/providers/bookmarks-provider";
import { useLikes } from "@/components/providers/likes-provider";
import { useReports } from "@/components/providers/reports-provider";
import { loadMorePosts } from "@/app/feed/actions";
import { ReportModal } from "./report-modal";
import {
  Bookmark,
  Flag,
  Forward,
  Heart,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { extractMuxPlaybackId } from "@/lib/mux-client";
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
  if (!accountHash) return src;

  // Extract Cloudflare image ID and build delivery URL with variant
  const cfMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  if (cfMatch) {
    return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
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
  media_type?: "image" | "video" | "gif";
  thumbnail_url?: string | null;
};

interface TimelineGalleryProps {
  posts: TimelineItem[];
  hasMore?: boolean;
  category?: string;
}

export function TimelineGallery({
  posts: initialPosts,
  hasMore: initialHasMore = false,
  category,
}: TimelineGalleryProps) {
  const [allPosts, setAllPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const { posts: newPosts, hasMore: newHasMore } = await loadMorePosts(page, category);
      setAllPosts((prev) => [...prev, ...newPosts]);
      setHasMore(newHasMore);
      setPage((prev) => prev + 1);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, page, category]);

  // Auto-trigger load when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) handleLoadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

  return (
    <div className="max-w-[470px] mx-auto">
      <div className="flex flex-col gap-4">
        {allPosts.map((post) => (
          <TimelinePost key={post.id} post={post} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center mt-8 mb-4">
          <button
            type="button"
            className="btn btn-secondary px-8 py-3"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {!hasMore && allPosts.length > 0 && (
        <p className="text-center text-sm text-text-muted mt-8 mb-4">
          You&apos;re all caught up
        </p>
      )}
    </div>
  );
}

function TimelinePost({ post }: { post: TimelineItem }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoRef = useRef<any>(null);
  const articleRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // Lazy-mount the video player only when the post is near the viewport.
  // Mounting with preload="auto" from the start lets HLS.js buffer and run
  // ABR before play() is called, which avoids the blurry cold-start issue
  // that occurs when preload is changed dynamically on a web component.
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const isVideo = post.media_type === "video";

  // Get the display URL for images
  const getDisplayUrl = () => {
    return getImageUrl(post.src, post.id, "medium");
  };

  // Handle cached images: onLoad fires before React attaches the handler,
  // so check img.complete on mount as a fallback.
  useEffect(() => {
    if (!isVideo && imgRef.current?.complete) {
      setMediaLoaded(true);
    }
  }, [isVideo]);

  // Stage 1: mount the player when the post is 400px away. Once mounted,
  // it stays mounted (no teardown) so play/pause can be handled via ref.
  useEffect(() => {
    if (!isVideo) return;
    const el = articleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVideoMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  // Stage 2: play when 50%+ visible, pause when it leaves.
  useEffect(() => {
    if (!isVideo) return;
    const el = articleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  return (
    <article ref={articleRef} className="bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden">
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

      {/* Media */}
      <div className="relative bg-bg-base">
        {isVideo ? (
          (() => {
            const playbackId = extractMuxPlaybackId(post.src);
            return (
              <div className="relative h-[80dvh] bg-bg-hover">
                {/* Thumbnail shown until the player mounts */}
                {!isVideoMounted && (
                  post.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 animate-pulse bg-bg-hover" />
                  )
                )}
                {/* Player mounts once (stays mounted) when post enters 400px proximity.
                    preload="auto" is set from the start so HLS.js can buffer and
                    run ABR before play() is called — avoids blurry cold-start. */}
                {isVideoMounted && (playbackId ? (
                  <MuxPlayer
                    ref={videoRef}
                    playbackId={playbackId}
                    streamType="on-demand"
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={() => setMediaLoaded(true)}
                    className={`w-full transition-opacity duration-300 ${
                      mediaLoaded ? "opacity-100" : "absolute inset-0 opacity-0"
                    }`}
                    style={{
                      "--controls": "none",
                      display: "block",
                      width: "100%",
                      height: "100%",
                      "--media-object-fit": "cover",
                    } as React.CSSProperties & Record<`--${string}`, string>}
                  />
                ) : (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video
                    ref={videoRef}
                    src={post.src}
                    className={`w-full h-full object-cover block transition-opacity duration-300 ${
                      mediaLoaded ? "opacity-100" : "absolute inset-0 w-full h-full opacity-0"
                    }`}
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={() => setMediaLoaded(true)}
                  />
                ))}
                {/* Play icon overlay - hide when playing */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <>
            {!mediaLoaded && (
              <div className="w-full h-[80dvh] animate-pulse bg-bg-hover" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={getDisplayUrl()}
              alt={post.title || `Post ${post.id}`}
              className={`w-full h-[80dvh] object-cover block transition-opacity duration-300 ${
                mediaLoaded ? "opacity-100" : "absolute inset-0 w-full h-full opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setMediaLoaded(true)}
            />
          </>
        )}
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
