"use client";
/* eslint-disable @next/next/no-img-element */

import MuxPlayer from "@mux/mux-player-react";
import {
  ChevronLeft,
  ChevronRight,
  Forward,
  Heart,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { getCollectionItems } from "@/app/actions/collections";
import type { ImageItem } from "@/components/gallery/image-gallery";
import { useBookmarks } from "@/components/providers/bookmarks-provider";
import { useLikes } from "@/components/providers/likes-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { extractMuxPlaybackId } from "@/lib/mux-client";

type ImageVariant = "thumbnail" | "medium" | "large" | "xlarge";

function getImageUrl(src: string, variant: ImageVariant = "large"): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) return src;

  const cfMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  if (cfMatch) {
    return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
  }

  return src;
}

function isVideo(mediaType?: string | null): boolean {
  return mediaType === "video";
}

// ---------------------------------------------------------------------------
// PostCard — Tumblr-style card
// ---------------------------------------------------------------------------

function PostCard({
  item,
  index,
  onExpand,
}: {
  item: ImageItem;
  index: number;
  onExpand: () => void;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const videoRef = useRef<any>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const itemIsVideo = isVideo(item.media_type);

  const imageSrc = item.thumbnail_url
    ? getImageUrl(item.thumbnail_url, "medium")
    : getImageUrl(item.src, "medium");

  const thumbnailImg = (
    <img
      src={item.thumbnail_url ?? ""}
      alt=""
      className="w-full h-auto max-h-[90dvh] object-contain"
    />
  );
  const videoThumbnail = item.thumbnail_url ? (
    thumbnailImg
  ) : (
    <div className="aspect-video animate-pulse bg-bg-hover" />
  );

  // Stage 1: mount the player when the post enters 400px proximity
  useEffect(() => {
    if (!itemIsVideo) return;
    const el = articleRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVideoMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemIsVideo]);

  // Stage 2: play when 50%+ visible, pause when it leaves
  useEffect(() => {
    if (!itemIsVideo || !isVideoMounted) return;
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
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemIsVideo, isVideoMounted]);

  return (
    <article
      ref={articleRef}
      className="group rounded-lg overflow-hidden bg-bg-elevated border border-border-subtle"
    >
      <button
        type="button"
        className="relative w-full cursor-pointer"
        onClick={onExpand}
      >
        {itemIsVideo ? (
          (() => {
            const playbackId = extractMuxPlaybackId(item.src);
            return (
              <div className="relative w-full flex flex-col justify-center bg-black overflow-hidden">
                {/* Thumbnail shown until player mounts */}
                {!isVideoMounted && videoThumbnail}
                {isVideoMounted &&
                  (playbackId ? (
                    <MuxPlayer
                      ref={videoRef}
                      playbackId={playbackId}
                      streamType="on-demand"
                      muted
                      loop
                      playsInline
                      preload="auto"
                      style={
                        {
                          width: "100%",
                          maxHeight: "90dvh",
                          "--media-object-fit": "contain",
                          "--controls": "none",
                        } as React.CSSProperties & Record<`--${string}`, string>
                      }
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={item.src}
                      className="w-full max-h-[90dvh] object-contain"
                      muted
                      loop
                      playsInline
                      preload="auto"
                    >
                      <track kind="captions" />
                    </video>
                  ))}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <img
            src={imageSrc}
            alt={item.title || "Collection item"}
            className="w-full h-auto max-h-[90dvh] object-contain"
            loading={index < 3 ? "eager" : "lazy"}
          />
        )}
      </button>

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-4">
          <LikeButton postId={String(item.id)} />
          <ShareButton postId={item.short_id || String(item.id)} />
        </div>
      </div>

      {/* Like count */}
      <div className="px-4 pt-2">
        <LikeCount postId={String(item.id)} initialLikes={item.likes} />
      </div>

      {item.title && (
        <div className="px-4 pt-2 pb-4">
          <p className="text-sm text-text-secondary">{item.title}</p>
        </div>
      )}
      {!item.title && <div className="pb-2" />}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({
  item,
  currentIndex,
  totalCount,
  onClose,
  onPrev,
  onNext,
}: {
  item: ImageItem;
  currentIndex: number;
  totalCount: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const itemIsVideo = isVideo(item.media_type);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") onPrev();
    if (e.key === "ArrowRight") onNext();
  };

  const mediaSrc = itemIsVideo
    ? item.src
    : getImageUrl(item.thumbnail_url || item.src, "xlarge");

  const playbackId = itemIsVideo ? extractMuxPlaybackId(item.src) : null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="absolute top-4 left-4 text-white/70 text-sm z-10">
        {currentIndex + 1} / {totalCount}
      </div>

      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div className="max-w-[80vw] max-h-[80vh] flex items-center justify-center">
        {itemIsVideo ? (
          playbackId ? (
            <MuxPlayer
              playbackId={playbackId}
              streamType="on-demand"
              autoPlay
              playsInline
              style={
                {
                  maxWidth: "80vw",
                  maxHeight: "80vh",
                  "--media-object-fit": "contain",
                } as React.CSSProperties & Record<`--${string}`, string>
              }
            />
          ) : (
            <video
              src={item.src}
              className="max-w-[80vw] max-h-[80vh] object-contain"
              controls
              autoPlay
              playsInline
            >
              <track kind="captions" />
            </video>
          )
        ) : (
          <img
            src={mediaSrc}
            alt={item.title || "Collection item"}
            className="max-w-[80vw] max-h-[80vh] object-contain"
          />
        )}
      </div>

      {currentIndex < totalCount - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white transition-colors z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollectionGrid — Tumblr-style vertical feed
// ---------------------------------------------------------------------------

interface CollectionGridProps {
  collectionId: string;
  initialItems: ImageItem[];
  initialHasMore: boolean;
}

export function CollectionGrid({
  collectionId,
  initialItems,
  initialHasMore,
}: CollectionGridProps) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (isPending) return;
    startTransition(async () => {
      const nextPage = page + 1;
      const { items: newItems, hasMore: more } = await getCollectionItems(
        collectionId,
        nextPage,
      );
      setItems((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(more);
    });
  }, [isPending, page, collectionId]);

  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < items.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <>
      {items.length === 0 ? (
        <p className="text-center text-text-muted py-20">
          This collection is empty.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {items.map((item, index) => (
            <PostCard
              key={item.id}
              item={item}
              index={index}
              onExpand={() => setSelectedIndex(index)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      )}

      {selectedIndex !== null && items[selectedIndex] && (
        <Lightbox
          item={items[selectedIndex]}
          currentIndex={selectedIndex}
          totalCount={items.length}
          onClose={() => setSelectedIndex(null)}
          onPrev={goToPrevious}
          onNext={goToNext}
        />
      )}
    </>
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
