"use client";

import { useBookmarks } from "@/components/providers/bookmarks-provider";
import { useLikes } from "@/components/providers/likes-provider";
import { useReports } from "@/components/providers/reports-provider";
import { getPaginatedPosts, getPostImages } from "@/app/actions/posts";
import { ReportModal } from "./report-modal";
import { Bookmark, ChevronLeft, ChevronRight, Flag, Forward, Heart, Loader2, MoreHorizontal, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

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

export type ImageCategory = {
  name: string;
  slug: string;
  color: string | null;
};

export type PostImage = {
  id: string;
  image_url: string;
  storage_path: string;
  position: number;
};

export type ImageItem = {
  id: string | number;
  src: string;
  likes: number;
  height?: string;
  title?: string;
  user_id?: string;
  short_id?: string | null;
  categories?: ImageCategory[];
  imageCount?: number;
  images?: PostImage[];
};

interface ImageGalleryProps {
  images: ImageItem[];
  categorySlug?: string;
  initialHasMore?: boolean;
}

export function ImageGallery({ images, categorySlug, initialHasMore = true }: ImageGalleryProps) {
  const [allImages, setAllImages] = useState<ImageItem[]>(images);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const [groupImages, setGroupImages] = useState<PostImage[]>([]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  const currentPostIndex = selectedImage ? allImages.findIndex((img) => img.id === selectedImage.id) : -1;
  const hasMultipleImages = groupImages.length > 1;
  const currentGroupImage = hasMultipleImages ? groupImages[groupIndex] : null;

  const loadMore = useCallback(() => {
    if (isPending) return;
    startTransition(async () => {
      const nextPage = page + 1;
      const { posts, hasMore: more } = await getPaginatedPosts(nextPage, categorySlug);
      setAllImages((prev) => [...prev, ...posts]);
      setPage(nextPage);
      setHasMore(more);
    });
  }, [isPending, page, categorySlug]);

  // Reset when images prop changes (e.g., category filter)
  useEffect(() => {
    setAllImages(images);
    setPage(0);
    setHasMore(initialHasMore);
  }, [images, initialHasMore]);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const loader = loaderRef.current;
    if (!loader || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(loader);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  useEffect(() => {
    if (selectedImage && modalRef.current) {
      modalRef.current.focus();
    }
  }, [selectedImage]);

  // Load group images when selecting a post with multiple images
  useEffect(() => {
    if (!selectedImage) {
      setGroupImages([]);
      setGroupIndex(0);
      return;
    }

    const imageCount = selectedImage.imageCount || 1;
    if (imageCount > 1) {
      setIsLoadingGroup(true);
      getPostImages(String(selectedImage.id))
        .then((images) => {
          setGroupImages(images);
          setGroupIndex(0);
        })
        .finally(() => {
          setIsLoadingGroup(false);
        });
    } else {
      setGroupImages([]);
      setGroupIndex(0);
    }
  }, [selectedImage]);

  // Preload adjacent images for smoother navigation
  useEffect(() => {
    if (!selectedImage || currentPostIndex === -1) return;

    const preloadImage = (src: string) => {
      const img = new Image();
      img.src = src;
    };

    // Preload next image in group
    if (hasMultipleImages && groupIndex < groupImages.length - 1) {
      const nextImg = groupImages[groupIndex + 1];
      preloadImage(getImageUrl(nextImg.image_url, nextImg.id, "xlarge"));
    }

    // Preload previous image in group
    if (hasMultipleImages && groupIndex > 0) {
      const prevImg = groupImages[groupIndex - 1];
      preloadImage(getImageUrl(prevImg.image_url, prevImg.id, "xlarge"));
    }

    // Preload next post's cover
    if (currentPostIndex < allImages.length - 1) {
      const nextPost = allImages[currentPostIndex + 1];
      preloadImage(getImageUrl(nextPost.src, nextPost.id, "xlarge"));
    }
  }, [selectedImage, currentPostIndex, allImages, groupImages, groupIndex, hasMultipleImages]);

  const goToPrevious = () => {
    // First navigate within group
    if (hasMultipleImages && groupIndex > 0) {
      setIsModalImageLoaded(false);
      setGroupIndex(groupIndex - 1);
      return;
    }
    // Then go to previous post
    if (currentPostIndex > 0) {
      setIsModalImageLoaded(false);
      setSelectedImage(allImages[currentPostIndex - 1]);
    }
  };

  const goToNext = () => {
    // First navigate within group
    if (hasMultipleImages && groupIndex < groupImages.length - 1) {
      setIsModalImageLoaded(false);
      setGroupIndex(groupIndex + 1);
      return;
    }
    // Then go to next post
    if (currentPostIndex < allImages.length - 1) {
      setIsModalImageLoaded(false);
      setSelectedImage(allImages[currentPostIndex + 1]);
    }
  };

  const handleImageSelect = (image: ImageItem) => {
    setIsModalImageLoaded(false);
    setSelectedImage(image);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setSelectedImage(null);
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  // Determine which image URL to show in modal
  const getModalImageUrl = () => {
    if (currentGroupImage) {
      return getImageUrl(currentGroupImage.image_url, currentGroupImage.id, "xlarge");
    }
    if (selectedImage) {
      return getImageUrl(selectedImage.src, selectedImage.id, "xlarge");
    }
    return "";
  };

  // Check if we can navigate previous (either in group or to previous post)
  const canGoPrevious = (hasMultipleImages && groupIndex > 0) || currentPostIndex > 0;

  // Check if we can navigate next (either in group or to next post)
  const canGoNext = (hasMultipleImages && groupIndex < groupImages.length - 1) || currentPostIndex < allImages.length - 1;

  return (
    <>
      {/* Expanded Image Modal */}
      {selectedImage && (
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 outline-none"
          onClick={() => setSelectedImage(null)}
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors z-10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-text-primary" />
          </button>

          {/* Previous button */}
          {canGoPrevious && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-bg-base/80 backdrop-blur-sm rounded-full hover:bg-bg-hover transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="w-6 h-6 text-text-primary" />
            </button>
          )}

          {/* Next button */}
          {canGoNext && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-bg-base/80 backdrop-blur-sm rounded-full hover:bg-bg-hover transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="w-6 h-6 text-text-primary" />
            </button>
          )}

          {/* Main content area */}
          <div
            role="presentation"
            className="relative max-w-[90vw] max-h-[75vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Skeleton loader */}
            {(!isModalImageLoaded || isLoadingGroup) && (
              <div className="min-w-[300px] min-h-[400px] md:min-w-[500px] md:min-h-[600px] rounded-xl bg-bg-elevated overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getModalImageUrl()}
              alt={selectedImage.title || `Artwork ${selectedImage.id}`}
              className={`max-w-full max-h-[75vh] object-contain rounded-xl ${(!isModalImageLoaded || isLoadingGroup) ? "hidden" : ""}`}
              onLoad={() => setIsModalImageLoaded(true)}
            />

            {/* Image navigation arrows - Instagram style over the image */}
            {hasMultipleImages && isModalImageLoaded && !isLoadingGroup && (
              <>
                {/* Previous arrow */}
                {groupIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalImageLoaded(false);
                      setGroupIndex(groupIndex - 1);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-800" />
                  </button>
                )}

                {/* Next arrow */}
                {groupIndex < groupImages.length - 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalImageLoaded(false);
                      setGroupIndex(groupIndex + 1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-800" />
                  </button>
                )}
              </>
            )}

            {isModalImageLoaded && !isLoadingGroup && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="avatar w-8 h-8" />
                    <span className="text-sm font-medium text-text-primary">Anonymous</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <LikeButton postId={String(selectedImage.id)} likes={selectedImage.likes} size="lg" />
                    <BookmarkButton postId={String(selectedImage.id)} size="lg" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Carousel dots at the bottom */}
          {hasMultipleImages && isModalImageLoaded && !isLoadingGroup && (
            <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
              {groupImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModalImageLoaded(false);
                    setGroupIndex(idx);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === groupIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allImages.map((item) => (
          <ImageCard key={item.id} item={item} onExpand={() => handleImageSelect(item)} />
        ))}
      </div>

      {/* Infinite scroll loader */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center mt-12 py-8">
          {isPending && (
            <div className="flex items-center gap-2 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function LikeButton({ postId, likes, size = "sm" }: { postId: string; likes: number; size?: "sm" | "lg" }) {
  const { isAuthenticated } = useBookmarks();
  const { isLiked, toggleLike, getLikeCount } = useLikes();
  const router = useRouter();
  const liked = isLiked(postId);
  const likeCount = getLikeCount(postId, likes);
  const iconSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const textSize = size === "lg" ? "text-sm" : "text-xs";
  const gap = size === "lg" ? "gap-1.5" : "gap-1";

  return (
    <button
      type="button"
      className={`flex items-center ${gap} text-text-primary hover:text-primary-400 transition-colors`}
      onClick={(e) => {
        e.stopPropagation();
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }
        toggleLike(postId);
      }}
    >
      <Heart className={`${iconSize} ${liked ? "fill-primary-400 text-primary-400" : ""}`} />
      <span className={`${textSize} font-medium`}>{likeCount}</span>
    </button>
  );
}

function BookmarkButton({ postId, size = "sm" }: { postId: string; size?: "sm" | "lg" }) {
  const { isBookmarked, toggleBookmark, isAuthenticated } = useBookmarks();
  const router = useRouter();
  const bookmarked = isBookmarked(postId);
  const iconSize = size === "lg" ? "w-5 h-5" : "w-4 h-4";

  return (
    <button
      type="button"
      className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }
        toggleBookmark(postId);
      }}
    >
      <Bookmark
        className={`${iconSize} ${bookmarked ? "fill-primary-400 text-primary-400" : "text-text-primary"}`}
      />
    </button>
  );
}

function ShareButton({ postId }: { postId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
          onClick={handleCopy}
          aria-label="Copy link"
        >
          <Forward className="w-4 h-4 text-text-primary" />
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
          className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-text-primary" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-bg-base rounded-lg shadow-lg overflow-hidden z-10 min-w-[140px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReportClick();
              }}
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

function ImageCard({ item, onExpand }: { item: ImageItem; onExpand: () => void }) {
  const heightClasses: Record<string, string> = {
    short: "aspect-[4/3]",
    medium: "aspect-square",
    tall: "aspect-[3/4]",
  };
  const heightClass = item.height ? heightClasses[item.height] : "aspect-square";
  const imageCount = item.imageCount || 1;

  return (
    <div className="group">
      <div className="image-card card-hover relative w-full">
        {/* Clickable image area */}
        <button
          type="button"
          className={`${heightClass} bg-bg-base cursor-pointer w-full`}
          onClick={onExpand}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(item.src, item.id, "medium")}
            alt={item.title || `Artwork ${item.id}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>

        {/* Carousel Dots - Always visible for multi-image posts */}
        {imageCount > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full">
            {Array.from({ length: Math.min(imageCount, 5) }).map((_, idx) => (
              <span
                key={`dot-${item.id}-${idx}`}
                className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? "bg-white" : "bg-white/50"}`}
              />
            ))}
            {imageCount > 5 && (
              <span className="text-[10px] text-white/80 ml-0.5">+{imageCount - 5}</span>
            )}
          </div>
        )}

        {/* Category Tags - Always visible */}
        {item.categories && item.categories.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[calc(100%-60px)]">
            {item.categories.slice(0, 2).map((cat) => (
              <span
                key={cat.slug}
                className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/60 backdrop-blur-sm text-white"
                style={cat.color ? { backgroundColor: `${cat.color}cc` } : undefined}
              >
                {cat.name}
              </span>
            ))}
            {item.categories.length > 2 && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/60 backdrop-blur-sm text-white">
                +{item.categories.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {/* Top Actions */}
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
            <ShareButton postId={item.short_id || String(item.id)} />
            <BookmarkButton postId={String(item.id)} />
            <MoreOptionsMenu postId={String(item.id)} />
          </div>

          {/* Bottom Info */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 pointer-events-auto ${imageCount > 1 ? "pb-10" : ""}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="avatar w-7 h-7" />
                <span className="text-sm font-medium text-text-primary">Anonymous</span>
              </div>
              <LikeButton postId={String(item.id)} likes={item.likes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
