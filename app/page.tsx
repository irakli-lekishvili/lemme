import { CategoryFilter } from "@/components/gallery/category-filter";
import { ImageGallery, type ImageItem } from "@/components/gallery/image-gallery";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

async function getCategories(): Promise<Category[]> {
  try {
    const supabase = await createClient();
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug, color")
      .order("name");
    return categories || [];
  } catch {
    return [];
  }
}

const PAGE_SIZE = 8;

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

async function getPosts(categorySlug?: string): Promise<{ posts: ImageItem[]; hasMore: boolean }> {
  try {
    const supabase = await createClient();

    if (categorySlug) {
      // Get category ID first
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();

      if (category) {
        // Get posts in this category
        const { data: postCategories } = await supabase
          .from("post_categories")
          .select("post_id")
          .eq("category_id", category.id);

        if (postCategories && postCategories.length > 0) {
          const postIds = postCategories.map((pc) => pc.post_id);
          const { data: posts } = await supabase
            .from("posts")
            .select("id, image_url, likes_count, title, user_id, short_id")
            .in("id", postIds)
            .order("created_at", { ascending: false })
            .range(0, PAGE_SIZE - 1);

          if (posts && posts.length > 0) {
            const imageCounts = await getPostImageCounts(supabase, posts.map(p => p.id));

            return {
              posts: posts.map((post) => ({
                id: post.id,
                src: post.image_url,
                likes: post.likes_count,
                title: post.title,
                user_id: post.user_id,
                short_id: post.short_id,
                imageCount: imageCounts.get(post.id) || 1,
              })),
              hasMore: posts.length === PAGE_SIZE,
            };
          }
        }
        return { posts: [], hasMore: false };
      }
    }

    const { data: posts } = await supabase
      .from("posts")
      .select("id, image_url, likes_count, title, user_id, short_id")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (posts && posts.length > 0) {
      const imageCounts = await getPostImageCounts(supabase, posts.map(p => p.id));

      return {
        posts: posts.map((post) => ({
          id: post.id,
          src: post.image_url,
          likes: post.likes_count,
          title: post.title,
          user_id: post.user_id,
          short_id: post.short_id,
          imageCount: imageCounts.get(post.id) || 1,
        })),
        hasMore: posts.length === PAGE_SIZE,
      };
    }
  } catch {
    // Database not set up yet
  }
  return { posts: [], hasMore: false };
}

type SearchParams = Promise<{ category?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [postsData, categories] = await Promise.all([
    getPosts(params.category),
    getCategories(),
  ]);
  const { posts: images, hasMore } = postsData;

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-12">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="max-w-[1800px] mx-auto px-6 mb-6">
            <CategoryFilter categories={categories} />
          </div>
        )}

        <div className="max-w-[1800px] mx-auto px-6">
          <div className="w-full">
            <ImageGallery images={images} categorySlug={params.category} initialHasMore={hasMore} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Lemme.Love. All rights reserved.
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
