"use server";

import { createClient } from "@/lib/supabase/server";
import type { TimelineItem } from "@/components/gallery/timeline-gallery";

const PAGE_SIZE = 20;
const SELECT =
  "id, image_url, likes_count, title, description, user_id, created_at, short_id, media_type, thumbnail_url";

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

export async function loadMorePosts(
  page: number,
  categorySlug?: string
): Promise<{ posts: TimelineItem[]; hasMore: boolean }> {
  try {
    const supabase = await createClient();
    const offset = page * PAGE_SIZE;

    if (categorySlug) {
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
        .range(offset, offset + PAGE_SIZE);

      if (!posts) return { posts: [], hasMore: false };
      const hasMore = posts.length > PAGE_SIZE;
      return {
        posts: (hasMore ? posts.slice(0, PAGE_SIZE) : posts).map(mapPost),
        hasMore,
      };
    }

    const { data: posts } = await supabase
      .from("posts")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE);

    if (!posts) return { posts: [], hasMore: false };
    const hasMore = posts.length > PAGE_SIZE;
    return {
      posts: (hasMore ? posts.slice(0, PAGE_SIZE) : posts).map(mapPost),
      hasMore,
    };
  } catch {
    return { posts: [], hasMore: false };
  }
}
