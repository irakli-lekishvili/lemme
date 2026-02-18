"use server";

import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export type CollectionMediaItem = {
  id: string;
  media_type: string;
  thumbnail_url: string | null;
  media_url: string;
  title: string | null;
  position: number;
};

export async function getCollectionItems(
  collectionId: string,
  page: number
): Promise<{ items: CollectionMediaItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  const offset = page * PAGE_SIZE;

  const { data: items } = await supabase
    .from("collection_items")
    .select("position, media:media(id, media_type, thumbnail_url, media_url, title)")
    .eq("collection_id", collectionId)
    .order("position", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (!items) return { items: [], hasMore: false };

  return {
    items: items.map((i) => ({
      ...(i.media as unknown as Omit<CollectionMediaItem, "position">),
      position: i.position,
    })),
    hasMore: items.length === PAGE_SIZE,
  };
}
