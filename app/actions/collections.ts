"use server";

import { createClient } from "@/lib/supabase/server";
import type { ImageItem } from "@/components/gallery/image-gallery";

const PAGE_SIZE = 20;

export async function getCollectionItems(
  collectionId: string,
  page: number
): Promise<{ items: ImageItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const offset = page * PAGE_SIZE;

  const { data: items } = await supabase
    .from("collection_items")
    .select("position, posts(id, image_url, title, short_id, media_type, thumbnail_url, likes_count)")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!items) return { items: [], hasMore: false };

  return {
    items: items.map((i) => {
      const p = i.posts as unknown as {
        id: string;
        image_url: string;
        title: string | null;
        short_id: string | null;
        media_type: string | null;
        thumbnail_url: string | null;
        likes_count: number;
      };
      return {
        id: p.id,
        src: p.image_url,
        title: p.title ?? undefined,
        short_id: p.short_id,
        media_type: p.media_type as ImageItem["media_type"],
        thumbnail_url: p.thumbnail_url,
        likes: p.likes_count,
      };
    }),
    hasMore: items.length === PAGE_SIZE,
  };
}
