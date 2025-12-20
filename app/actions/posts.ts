"use server";

import { createClient } from "@/lib/supabase/server";

export type PostItem = {
  id: string;
  src: string;
  likes: number;
  title?: string;
  user_id?: string;
  short_id?: string | null;
};

const PAGE_SIZE = 8;

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
          .select("id, image_url, likes_count, title, user_id, short_id")
          .in("id", postIds)
          .order("created_at", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (posts) {
          return {
            posts: posts.map((post) => ({
              id: post.id,
              src: post.image_url,
              likes: post.likes_count,
              title: post.title,
              user_id: post.user_id,
              short_id: post.short_id,
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
    .select("id, image_url, likes_count, title, user_id, short_id")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (posts) {
    return {
      posts: posts.map((post) => ({
        id: post.id,
        src: post.image_url,
        likes: post.likes_count,
        title: post.title,
        user_id: post.user_id,
        short_id: post.short_id,
      })),
      hasMore: posts.length === PAGE_SIZE,
    };
  }

  return { posts: [], hasMore: false };
}
