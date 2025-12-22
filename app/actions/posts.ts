"use server";

import { createClient } from "@/lib/supabase/server";

export type MediaType = "image" | "video" | "gif";

export type PostImage = {
  id: string;
  image_url: string;
  storage_path: string;
  position: number;
  media_type?: MediaType;
  thumbnail_url?: string | null;
};

export type PostItem = {
  id: string;
  src: string;
  likes: number;
  title?: string;
  user_id?: string;
  short_id?: string | null;
  imageCount?: number;
  images?: PostImage[];
  media_type?: MediaType;
  thumbnail_url?: string | null;
};

const PAGE_SIZE = 8;

async function getPostImageCounts(supabase: Awaited<ReturnType<typeof createClient>>, postIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (postIds.length === 0) return counts;

  const { data: imageCounts } = await supabase
    .from("post_images")
    .select("post_id")
    .in("post_id", postIds);

  if (imageCounts) {
    // Count occurrences of each post_id
    for (const row of imageCounts) {
      counts.set(row.post_id, (counts.get(row.post_id) || 0) + 1);
    }
  }

  return counts;
}

export async function getPaginatedPosts(
  page: number,
  categorySlug?: string
): Promise<{ posts: PostItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const offset = page * PAGE_SIZE;

  if (categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();

    if (category) {
      const { data: postCategories } = await supabase
        .from("post_categories")
        .select("post_id")
        .eq("category_id", category.id);

      if (postCategories && postCategories.length > 0) {
        const postIds = postCategories.map((pc) => pc.post_id);
        const { data: posts } = await supabase
          .from("posts")
          .select("id, image_url, likes_count, title, user_id, short_id, media_type, thumbnail_url")
          .in("id", postIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (posts) {
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
              media_type: post.media_type as MediaType,
              thumbnail_url: post.thumbnail_url,
            })),
            hasMore: posts.length === PAGE_SIZE,
          };
        }
      }
      return { posts: [], hasMore: false };
    }
    return { posts: [], hasMore: false };
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url, likes_count, title, user_id, short_id, media_type, thumbnail_url")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (posts) {
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
        media_type: post.media_type as MediaType,
        thumbnail_url: post.thumbnail_url,
      })),
      hasMore: posts.length === PAGE_SIZE,
    };
  }

  return { posts: [], hasMore: false };
}

export async function getPostImages(postId: string): Promise<PostImage[]> {
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("post_images")
    .select("id, image_url, storage_path, position, media_type, thumbnail_url")
    .eq("post_id", postId)
    .order("position", { ascending: true });

  return (images || []).map((img) => ({
    ...img,
    media_type: img.media_type as MediaType,
  }));
}
