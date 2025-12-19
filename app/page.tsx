import { ImageGallery, type ImageItem } from "@/components/gallery/image-gallery";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

// Sample data for fallback/demo
const sampleImages: ImageItem[] = [
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

async function getPosts(): Promise<ImageItem[]> {
  try {
    const supabase = await createClient();
    const { data: posts } = await supabase
      .from("posts")
      .select("id, image_url, likes_count, title, user_id")
      .order("created_at", { ascending: false });

    if (posts && posts.length > 0) {
      return posts.map((post) => ({
        id: post.id,
        src: post.image_url,
        likes: post.likes_count,
        title: post.title,
        user_id: post.user_id,
      }));
    }
  } catch {
    // Database not set up yet, use sample images
  }
  return sampleImages;
}

export default async function Home() {
  const images = await getPosts();
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
          <div className="w-full">
            <ImageGallery images={images} />
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
