"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import MuxPlayer from "@mux/mux-player-react";
import { extractMuxPlaybackId } from "@/lib/mux-client";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  Calendar,
  Film,
  ImageIcon,
  Trash2,
  X,
  Check,
  Maximize2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePosts } from "@/app/admin/actions";

export interface PostItem {
  id: string;
  postId: string;
  title: string | null;
  thumbnail_url: string | null;
  image_url: string;
  short_id: string | null;
  media_type: string | null;
  likes_count: number | null;
  created_at: string;
  deleted_at: string | null;
  position: number;
}

interface PostsListProps {
  items: PostItem[];
  view: "grid" | "list";
}

export function PostsList({ items, view }: PostsListProps) {
  // Selection tracks post IDs (deleting a post deletes all its images)
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const deletedCount = items.filter((i) => i.deleted_at).length;
  const visibleItems = showDeleted ? items : items.filter((i) => !i.deleted_at);

  const deletablePostIds = [
    ...new Set(visibleItems.filter((i) => !i.deleted_at).map((i) => i.postId)),
  ];
  const allDeletableSelected =
    deletablePostIds.length > 0 &&
    deletablePostIds.every((id) => selectedPosts.has(id));

  function togglePost(postId: string) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function toggleAll() {
    if (allDeletableSelected) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(deletablePostIds));
    }
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedPosts);
    if (!confirm(`Are you sure you want to delete ${ids.length} post(s)?`))
      return;

    startTransition(async () => {
      await deletePosts(ids);
      setSelectedPosts(new Set());
    });
  }

  return (
    <div>
      {/* Show deleted toggle */}
      {deletedCount > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-bg-elevated border border-border-subtle hover:border-border-strong text-text-secondary hover:text-text-primary"
          >
            {showDeleted ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            {showDeleted ? "Hide deleted" : `Show deleted (${deletedCount})`}
          </button>
        </div>
      )}

      {/* Selection bar */}
      {selectedPosts.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-bg-elevated border border-border-subtle rounded-xl">
          <button
            onClick={() => setSelectedPosts(new Set())}
            className="p-1 rounded-md hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-text-primary">
            {selectedPosts.size} post{selectedPosts.size !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="h-4 w-px bg-border-subtle" />
          <button
            onClick={toggleAll}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {allDeletableSelected ? "Deselect all" : "Select all"}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error-500/10 text-error-400 hover:bg-error-500/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isPending ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleItems.map((item) => {
            const isSelected = selectedPosts.has(item.postId);
            return (
              <div
                key={item.id}
                className={`group bg-bg-card border rounded-xl overflow-hidden transition-colors ${
                  item.deleted_at
                    ? "border-error-500/30 opacity-60"
                    : isSelected
                      ? "border-primary-500 ring-1 ring-primary-500/30"
                      : "border-border-subtle hover:border-border-strong"
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square relative bg-bg-surface cursor-pointer"
                  onClick={() => !item.deleted_at && togglePost(item.postId)}
                >
                  {item.thumbnail_url || item.image_url ? (
                    <Image
                      src={item.thumbnail_url || item.image_url}
                      alt={item.title || "Post"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-text-disabled" />
                    </div>
                  )}

                  {/* Checkbox overlay */}
                  {!item.deleted_at && (
                    <div
                      className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-primary-500 border-primary-500"
                          : "border-white/60 bg-black/30 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                  )}

                  {/* Media type badge */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 flex items-center gap-1">
                    {item.media_type === "video" ? (
                      <>
                        <Film className="w-3 h-3 text-white" />
                        <span className="text-xs text-white font-medium">
                          Video
                        </span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3 text-white" />
                        <span className="text-xs text-white font-medium">
                          Image
                        </span>
                      </>
                    )}
                  </div>
                  {item.deleted_at && (
                    <div className="absolute top-2 right-2 bg-error-500/80 backdrop-blur-sm rounded-md px-2 py-0.5">
                      <span className="text-xs text-white font-medium">
                        Deleted
                      </span>
                    </div>
                  )}

                  {/* Enlarge button */}
                  {!item.deleted_at && (item.thumbnail_url || item.image_url) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = visibleItems.findIndex((v) => v.id === item.id);
                        if (idx !== -1) setEnlargedIndex(idx);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 text-white"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {item.title || "Untitled"}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {item.likes_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <Link
                      href={`/post/${item.short_id || item.postId}`}
                      target="_blank"
                      className="p-1 rounded-md hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="w-10">
                  <button
                    onClick={toggleAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      allDeletableSelected
                        ? "bg-primary-500 border-primary-500"
                        : "border-text-disabled hover:border-text-muted"
                    }`}
                  >
                    {allDeletableSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.map((item) => {
                const isSelected = selectedPosts.has(item.postId);
                return (
                  <TableRow
                    key={item.id}
                    className={`${item.deleted_at ? "opacity-60" : ""} ${isSelected ? "bg-primary-500/5" : ""}`}
                  >
                    <TableCell>
                      {!item.deleted_at ? (
                        <button
                          onClick={() => togglePost(item.postId)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary-500 border-primary-500"
                              : "border-text-disabled hover:border-text-muted"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.thumbnail_url || item.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-bg-surface relative">
                          <Image
                            src={item.thumbnail_url || item.image_url}
                            alt={item.title || "Post"}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-bg-surface flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-text-disabled" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">
                          {item.title || "Untitled"}
                        </span>
                        {item.deleted_at && (
                          <span className="badge bg-error-500/10 text-error-400">
                            Deleted
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge badge-secondary">
                        {item.media_type || "image"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-text-secondary">
                      {item.likes_count ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/post/${item.short_id || item.postId}`}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary inline-flex"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Lightbox */}
      {enlargedIndex !== null && visibleItems[enlargedIndex] && (
        <AdminLightbox
          item={visibleItems[enlargedIndex]}
          isSelected={selectedPosts.has(visibleItems[enlargedIndex].postId)}
          onToggleSelect={() => {
            const item = visibleItems[enlargedIndex];
            if (!item.deleted_at) togglePost(item.postId);
          }}
          onClose={() => setEnlargedIndex(null)}
          onPrev={enlargedIndex > 0 ? () => setEnlargedIndex(enlargedIndex - 1) : undefined}
          onNext={enlargedIndex < visibleItems.length - 1 ? () => setEnlargedIndex(enlargedIndex + 1) : undefined}
        />
      )}
    </div>
  );
}

function AdminLightbox({
  item,
  isSelected,
  onToggleSelect,
  onClose,
  onPrev,
  onNext,
}: {
  item: PostItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVideo = item.media_type === "video";

  useEffect(() => {
    containerRef.current?.focus();
  }, [item.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && onPrev) onPrev();
    if (e.key === "ArrowRight" && onNext) onNext();
    if (e.key === " " && !item.deleted_at) {
      e.preventDefault();
      onToggleSelect();
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 outline-none"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Select button */}
      {!item.deleted_at && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm font-medium z-10"
        >
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected
                ? "bg-primary-500 border-primary-500"
                : "border-white/60"
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          {isSelected ? "Selected" : "Select"}
        </button>
      )}

      {/* Previous button */}
      {onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Next button */}
      {onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Media content */}
      <div
        className="relative max-w-[80vw] max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          (() => {
            const playbackId = extractMuxPlaybackId(item.image_url);
            return playbackId ? (
              <div
                style={{
                  maxWidth: "80vw",
                  height: "80vh",
                  overflow: "hidden",
                  borderRadius: "0.5rem",
                }}
              >
                <MuxPlayer
                  playbackId={playbackId}
                  streamType="on-demand"
                  autoPlay
                  loop
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    "--media-object-fit": "contain",
                  } as React.CSSProperties & Record<`--${string}`, string>}
                />
              </div>
            ) : (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={item.image_url}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="max-w-full max-h-[80vh] rounded-lg"
              />
            );
          })()
        ) : (
          <Image
            src={item.image_url}
            alt={item.title || "Enlarged view"}
            width={1200}
            height={1200}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
}
