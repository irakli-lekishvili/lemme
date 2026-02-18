import { CategoryFilter } from "@/components/gallery/category-filter";
import {
  TimelineGallery,
  type TimelineItem,
} from "@/components/gallery/timeline-gallery";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

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

function mapPost(post: {
  id: string;
  image_url: string;
  likes_count: number;
  title?: string | null;
  description?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  short_id?: string | null;
  media_type?: "image" | "video" | "gif" | null;
  thumbnail_url?: string | null;
}): TimelineItem {
  return {
    id: post.id,
    src: post.image_url,
    likes: post.likes_count,
    title: post.title ?? undefined,
    description: post.description ?? undefined,
    user_id: post.user_id ?? undefined,
    short_id: post.short_id ?? undefined,
    created_at: post.created_at ?? undefined,
    media_type: post.media_type ?? undefined,
    thumbnail_url: post.thumbnail_url,
  };
}

async function getPosts(categorySlug?: string): Promise<{ posts: TimelineItem[]; hasMore: boolean }> {
  try {
    const supabase = await createClient();
    const SELECT = "id, image_url, likes_count, title, description, user_id, created_at, short_id, media_type, thumbnail_url";

    if (categorySlug) {
      // Resolve category in one query, then use inner join via post_categories
      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .single();

      if (!category) return { posts: [], hasMore: false };

      const { data: postCategories } = await supabase
        .from("post_categories")
        .select("post_id")
        .eq("category_id", category.id);

      if (!postCategories?.length) return { posts: [], hasMore: false };

      const postIds = postCategories.map((pc) => pc.post_id);
      const { data: posts } = await supabase
        .from("posts")
        .select(SELECT)
        .in("id", postIds)
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE); // fetches PAGE_SIZE+1 to detect hasMore

      if (!posts) return { posts: [], hasMore: false };
      const hasMore = posts.length > PAGE_SIZE;
      return { posts: (hasMore ? posts.slice(0, PAGE_SIZE) : posts).map(mapPost), hasMore };
    }

    const { data: posts } = await supabase
      .from("posts")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE); // fetches PAGE_SIZE+1 to detect hasMore

    if (!posts) return { posts: [], hasMore: false };
    const hasMore = posts.length > PAGE_SIZE;
    return { posts: (hasMore ? posts.slice(0, PAGE_SIZE) : posts).map(mapPost), hasMore };
  } catch {
    // Database not set up yet
  }
  return { posts: [], hasMore: false };
}

type SearchParams = Promise<{ category?: string }>;

export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const [{ posts, hasMore }, categories] = await Promise.all([
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
          <TimelineGallery
            key={params.category || "all"}
            posts={posts}
            hasMore={hasMore}
            category={params.category}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[470px] mx-auto px-4">
          <p className="text-sm text-text-muted text-center">
            © {new Date().getFullYear()} Lemme.Love. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
