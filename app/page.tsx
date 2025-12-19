import { Navbar } from "@/components/layout/navbar";
import { Bookmark, Download, Heart, MoreHorizontal } from "lucide-react";
import Link from "next/link";

// Sample data with different aspect ratios
const images = [
  { id: 1, src: "https://picsum.photos/400/600", likes: 234, height: "tall" },
  { id: 2, src: "https://picsum.photos/400/300", likes: 89, height: "short" },
  { id: 3, src: "https://picsum.photos/400/400", likes: 567, height: "medium" },
  { id: 4, src: "https://picsum.photos/400/500", likes: 123, height: "tall" },
  { id: 5, src: "https://picsum.photos/400/350", likes: 445, height: "short" },
  { id: 6, src: "https://picsum.photos/400/450", likes: 78, height: "medium" },
  { id: 7, src: "https://picsum.photos/400/550", likes: 901, height: "tall" },
  { id: 8, src: "https://picsum.photos/400/320", likes: 234, height: "short" },
  { id: 9, src: "https://picsum.photos/400/480", likes: 156, height: "medium" },
  { id: 10, src: "https://picsum.photos/400/600", likes: 678, height: "tall" },
  { id: 11, src: "https://picsum.photos/400/380", likes: 345, height: "short" },
  { id: 12, src: "https://picsum.photos/400/420", likes: 89, height: "medium" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-12">
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1 p-1 bg-bg-elevated rounded-xl">
            <button type="button" className="tab tab-active">For You</button>
            <button type="button" className="tab">Following</button>
            <button type="button" className="tab">Trending</button>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-6">
          {/* Grid - Masonry */}
          <div className="w-full">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {images.map((item) => (
                <ImageCard key={item.id} item={item} />
              ))}
            </div>

            {/* Load More */}
            <div className="flex justify-center mt-12">
              <button type="button" className="btn btn-secondary px-8 py-3">
                Load More
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              © 2024 Lemme.Love. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Privacy
              </Link>
              <Link href="/support" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ImageCard({ item }: { item: { id: number; src: string; likes: number; height: string } }) {
  const heightClass = {
    short: "aspect-[4/3]",
    medium: "aspect-square",
    tall: "aspect-[3/4]",
  }[item.height];

  return (
    <div className="break-inside-avoid group">
      <div className="image-card card-hover relative">
        <div className={`${heightClass} bg-bg-base`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${item.src}?random=${item.id}`}
            alt={`AI generated artwork ${item.id}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Top Actions */}
          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
              <Bookmark className="w-4 h-4 text-text-primary" />
            </button>
            <button type="button" className="p-2 bg-bg-base/80 backdrop-blur-sm rounded-lg hover:bg-bg-hover transition-colors">
              <MoreHorizontal className="w-4 h-4 text-text-primary" />
            </button>
          </div>

          {/* Bottom Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
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
