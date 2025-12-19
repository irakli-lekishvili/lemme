import { CategoryFilter } from "@/components/gallery/category-filter";
import {
  TimelineGallery,
  type TimelineItem,
} from "@/components/gallery/timeline-gallery";
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

async function getPosts(categorySlug?: string): Promise<TimelineItem[]> {
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
            .select("id, image_url, likes_count, title, description, user_id, created_at, short_id")
            .in("id", postIds)
            .order("created_at", { ascending: false });

          if (posts && posts.length > 0) {
            return posts.map((post) => ({
              id: post.id,
              src: post.image_url,
              likes: post.likes_count,
              title: post.title,
              description: post.description,
              user_id: post.user_id,
              short_id: post.short_id,
              created_at: post.created_at,
            }));
          }
        }
        return [];
      }
    }

    const { data: posts } = await supabase
      .from("posts")
      .select("id, image_url, likes_count, title, description, user_id, created_at, short_id")
      .order("created_at", { ascending: false });

    if (posts && posts.length > 0) {
      return posts.map((post) => ({
        id: post.id,
        src: post.image_url,
        likes: post.likes_count,
        title: post.title,
        description: post.description,
        user_id: post.user_id,
        short_id: post.short_id,
        created_at: post.created_at,
      }));
    }
  } catch {
    // Database not set up yet
  }
  return [];
}

type SearchParams = Promise<{ category?: string }>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [posts, categories] = await Promise.all([
    getPosts(params.category),
    getCategories(),
  ]);

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

        <div className="px-4">
          <TimelineGallery posts={posts} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[470px] mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Lemme.Love. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/support"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
