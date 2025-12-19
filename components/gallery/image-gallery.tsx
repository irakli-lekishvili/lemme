"use client";

import { Bookmark, ChevronLeft, ChevronRight, Download, Heart, MoreHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ImageCategory = {
  name: string;
  slug: string;
  color: string | null;
};

export type ImageItem = {
  id: string | number;
  src: string;
  likes: number;
  height?: string;
  title?: string;
  user_id?: string;
  categories?: ImageCategory[];
};

interface ImageGalleryProps {
  images: ImageItem[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentIndex = selectedImage ? images.findIndex((img) => img.id === selectedImage.id) : -1;

  useEffect(() => {
    if (selectedImage && modalRef.current) {
      modalRef.current.focus();
    }
  }, [selectedImage]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setSelectedImage(null);
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  return (
    <>
      {/* Expanded Image Modal */}
      {selectedImage && (
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 outline-none"
          onClick={() => setSelectedImage(null)}
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            type="button"
            className="absolute top-4 right-4 p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6 text-text-primary" />
          </button>

          {/* Previous button */}
          {currentIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="w-6 h-6 text-text-primary" />
            </button>
          )}

          {/* Next button */}
          {currentIndex < images.length - 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="w-6 h-6 text-text-primary" />
            </button>
          )}
          <div
            role="presentation"
            className="relative max-w-[90vw] max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.src.includes("picsum") ? `${selectedImage.src}?random=${selectedImage.id}` : selectedImage.src}
              alt={selectedImage.title || `Artwork ${selectedImage.id}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="avatar w-8 h-8" />
                  <span className="text-sm font-medium text-text-primary">user_{selectedImage.id}</span>
                </div>
                <div className="flex items-center gap-4">
                  <button type="button" className="flex items-center gap-1.5 text-text-primary hover:text-primary-400 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm font-medium">{selectedImage.likes}</span>
                  </button>
                  <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
                    <Bookmark className="w-5 h-5 text-text-primary" />
                  </button>
                  <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
                    <Download className="w-5 h-5 text-text-primary" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid - Masonry */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {images.map((item) => (
          <ImageCard key={item.id} item={item} onExpand={() => setSelectedImage(item)} />
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center mt-12">
        <button type="button" className="btn btn-secondary px-8 py-3">
          Load More
        </button>
      </div>
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

  return (
    <div className="break-inside-avoid group">
      <div className="image-card card-hover relative w-full">
        {/* Clickable image area */}
        <button
          type="button"
          className={`${heightClass} bg-bg-base cursor-pointer w-full`}
          onClick={onExpand}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.src.includes("picsum") ? `${item.src}?random=${item.id}` : item.src}
            alt={item.title || `Artwork ${item.id}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>

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
            <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
              <Bookmark className="w-4 h-4 text-text-primary" />
            </button>
            <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
              <MoreHorizontal className="w-4 h-4 text-text-primary" />
            </button>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="avatar w-7 h-7" />
                <span className="text-sm font-medium text-text-primary">user_{item.id}</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className="flex items-center gap-1 text-text-primary hover:text-primary-400 transition-colors">
                  <Heart className="w-4 h-4" />
                  <span className="text-xs font-medium">{item.likes}</span>
                </button>
                <button type="button" className="text-text-primary hover:text-primary-400 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
