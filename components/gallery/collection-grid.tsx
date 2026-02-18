"use client";

import { getCollectionItems } from "@/app/actions/collections";
import type { ImageItem } from "@/components/gallery/image-gallery";
import { extractMuxPlaybackId } from "@/lib/mux-client";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  X,
} from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

type ImageVariant = "thumbnail" | "medium" | "large" | "xlarge";

function getImageUrl(src: string, id: string | number, variant: ImageVariant = "large"): string {
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
    ? getImageUrl(item.thumbnail_url, item.id, "medium")
    : getImageUrl(item.src, item.id, "medium");

  /* eslint-disable @next/next/no-img-element */
  const videoThumbnail = item.thumbnail_url
    ? <img src={item.thumbnail_url} alt="" className="w-full object-cover" />
    : <div className="aspect-video animate-pulse bg-bg-hover" />;
  /* eslint-enable @next/next/no-img-element */

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
      { rootMargin: "400px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [itemIsVideo]);

  // Stage 2: play when 50%+ visible, pause when it leaves
  useEffect(() => {
    if (!itemIsVideo) return;
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
  }, [itemIsVideo]);

  return (
    <article ref={articleRef} className="group rounded-lg overflow-hidden bg-bg-elevated border border-border-subtle">
      <button
        type="button"
        className="relative w-full cursor-pointer"
        onClick={onExpand}
      >
        {itemIsVideo ? (
          (() => {
            const playbackId = extractMuxPlaybackId(item.src);
            return (
              <div className="relative">
                {/* Thumbnail shown until player mounts */}
                {!isVideoMounted && videoThumbnail}
                {isVideoMounted && (playbackId ? (
                  <MuxPlayer
                    ref={videoRef}
                    playbackId={playbackId}
                    streamType="on-demand"
                    muted
                    loop
                    playsInline
                    preload="auto"
                    style={{
                      width: "100%",
                      "--media-object-fit": "cover",
                      "--controls": "none",
                    } as React.CSSProperties & Record<`--${string}`, string>}
                  />
                ) : (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video
                    ref={videoRef}
                    src={item.src}
                    className="w-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
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
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={item.title || "Collection item"}
            className="w-full object-cover"
            loading={index < 3 ? "eager" : "lazy"}
          />
        )}
      </button>

      {item.title && (
        <div className="px-4 py-3">
          <p className="text-sm text-text-secondary">{item.title}</p>
        </div>
      )}
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
  }, [item]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") onPrev();
    if (e.key === "ArrowRight") onNext();
  };

  const mediaSrc = itemIsVideo
    ? item.src
    : getImageUrl(item.thumbnail_url || item.src, item.id, "xlarge");

  const playbackId = itemIsVideo ? extractMuxPlaybackId(item.src) : null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
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
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
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
              style={{
                maxWidth: "80vw",
                maxHeight: "80vh",
                "--media-object-fit": "contain",
              } as React.CSSProperties & Record<`--${string}`, string>}
            />
          ) : (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              src={item.src}
              className="max-w-[80vw] max-h-[80vh] object-contain"
              controls
              autoPlay
              playsInline
            />
          )
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
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
          onClick={(e) => { e.stopPropagation(); onNext(); }}
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
      const { items: newItems, hasMore: more } = await getCollectionItems(collectionId, nextPage);
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
      { threshold: 0.1, rootMargin: "100px" }
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
        <p className="text-center text-text-muted py-20">This collection is empty.</p>
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
