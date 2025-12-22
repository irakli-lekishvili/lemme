import { ImageGallery, type ImageItem } from "@/components/gallery/image-gallery";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { Bookmark } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getPostImageCounts(supabase: Awaited<ReturnType<typeof createClient>>, postIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data: imageCounts } = await supabase
    .from("post_images")
    .select("post_id")
    .in("post_id", postIds);

  if (imageCounts) {
    for (const row of imageCounts) {
      counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1);
    }
  }
  return counts;
}

async function getBookmarkedPosts(userId: string): Promise<ImageItem[]> {
  const supabase = await createClient();

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!bookmarks || bookmarks.length === 0) {
    return [];
  }

  const postIds = bookmarks.map((b) => b.post_id);
  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, likes_count, title, user_id, short_id, media_type, thumbnail_url")
    .in("id", postIds);

  if (!posts) {
    return [];
  }

  const imageCounts = await getPostImageCounts(supabase, posts.map(p => p.id));

  // Maintain bookmark order
  const postMap = new Map(posts.map((p) => [p.id, p]));
  return postIds
    .map((id) => postMap.get(id))
    .filter(Boolean)
    .map((post) => ({
      id: post!.id,
      src: post!.image_url,
      likes: post!.likes_count,
      title: post!.title,
      user_id: post!.user_id,
      short_id: post!.short_id,
      imageCount: imageCounts.get(post!.id) || 1,
      media_type: post!.media_type,
      thumbnail_url: post!.thumbnail_url,
    }));
}

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const images = await getBookmarkedPosts(user.id);

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[1800px] mx-auto px-6">
          <h1 className="text-2xl font-bold text-text-primary mb-8">
            Your Bookmarks
          </h1>

          {images.length > 0 ? (
            <ImageGallery images={images} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center mb-6">
                <Bookmark className="w-8 h-8 text-text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                No bookmarks yet
              </h2>
              <p className="text-text-muted text-center max-w-md mb-6">
                Save your favorite images by clicking the bookmark icon. They'll
                appear here for easy access.
              </p>
              <Link href="/" className="btn btn-primary px-6 py-2.5">
                Discover Images
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
