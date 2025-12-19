import {
  Bookmark,
  ChevronDown,
  Download,
  Heart,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";

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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border-subtle">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">
              LEMME<span className="text-primary-500">.</span>LOVE
            </h1>
            <div className="hidden md:flex items-center gap-6">
              <a href="/discover" className="text-sm font-medium text-text-primary hover:text-primary-400 transition-colors">
                Discover
              </a>
              <a href="/shop" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                Shop
                <span className="badge badge-new text-[10px] px-1.5 py-0.5">NEW</span>
              </a>
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
            <div className="relative">
              <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Try 'cyberpunk aesthetic' or 'ethereal portrait'"
                className="input pl-11 pr-20 py-2.5 bg-bg-elevated"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" className="p-1.5 hover:bg-bg-hover rounded-md transition-colors">
                  <Search className="w-4 h-4 text-text-muted" />
                </button>
                <button type="button" className="p-1.5 hover:bg-bg-hover rounded-md transition-colors">
                  <Settings className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-outline py-2 px-4">
              Create
            </button>
            <button type="button" className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
              <Zap className="w-5 h-5 text-text-secondary" />
            </button>
            <button type="button" className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
              <Bookmark className="w-5 h-5 text-text-secondary" />
            </button>
            <button type="button" className="flex items-center gap-2 p-1 hover:bg-bg-hover rounded-lg transition-colors">
              <div className="avatar w-8 h-8" />
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
      </nav>

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

        <div className="max-w-[1800px] mx-auto px-6 flex gap-6">
          {/* Sidebar */}
          <aside className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Connect Widget */}
              <div className="bg-bg-card rounded-2xl p-6 border border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary text-center mb-2">
                  Connect elements
                </h3>
                <p className="text-xs text-text-muted text-center mb-4">
                  to improve your feed
                </p>
                <div className="w-full h-2 bg-bg-hover rounded-full mb-3">
                  <div className="h-full w-1/4 gradient-primary rounded-full" />
                </div>
                <p className="text-xs text-text-muted text-center">
                  <span className="text-text-secondary font-medium">2/10</span> connected
                </p>
              </div>

              {/* Quick Actions */}
              <div className="bg-bg-card rounded-2xl p-4 border border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary mb-4 px-2">
                  Quick Create
                </h3>
                <div className="space-y-1">
                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-hover transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-primary-950 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">New Image</p>
                      <p className="text-xs text-text-muted">Generate with AI</p>
                    </div>
                  </button>
                  <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-hover transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-secondary-950 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-secondary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">Remix</p>
                      <p className="text-xs text-text-muted">Edit existing</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Trending Tags */}
              <div className="bg-bg-card rounded-2xl p-4 border border-border-subtle">
                <h3 className="text-sm font-semibold text-text-primary mb-4 px-2">
                  Trending Tags
                </h3>
                <div className="flex flex-wrap gap-2 px-2">
                  <span className="badge badge-primary">cyberpunk</span>
                  <span className="badge badge-secondary">ethereal</span>
                  <span className="badge bg-bg-hover text-text-secondary">portrait</span>
                  <span className="badge bg-bg-hover text-text-secondary">fantasy</span>
                  <span className="badge bg-bg-hover text-text-secondary">noir</span>
                  <span className="badge badge-primary">anime</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Grid - Masonry */}
          <div className="flex-1">
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
              <a href="/terms" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Terms
              </a>
              <a href="/privacy" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Privacy
              </a>
              <a href="/support" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Support
              </a>
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
