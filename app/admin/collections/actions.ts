"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden");

  return user;
}

export async function createCollection(formData: FormData) {
  await verifyAdmin();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = (formData.get("description") as string) || null;
  const cover_image_url = (formData.get("cover_image_url") as string) || null;

  if (!name || !slug) throw new Error("Name and slug are required");

  const service = createServiceClient();

  const { error } = await service.from("collections").insert({
    name,
    slug,
    description,
    cover_image_url,
  });

  if (error) {
    if (error.code === "23505") throw new Error("A collection with this slug already exists");
    throw new Error(error.message);
  }

  revalidatePath("/admin/collections");
}

export async function deleteCollection(collectionId: string) {
  await verifyAdmin();

  const service = createServiceClient();

  const { error } = await service
    .from("collections")
    .delete()
    .eq("id", collectionId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/collections");
}

export async function updateCollection(
  collectionId: string,
  data: { name?: string; description?: string; cover_image_url?: string }
) {
  await verifyAdmin();

  const service = createServiceClient();

  const { error } = await service
    .from("collections")
    .update(data)
    .eq("id", collectionId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/collections");
}

export async function addItemsToCollection(
  collectionId: string,
  mediaIds: string[]
) {
  await verifyAdmin();

  if (mediaIds.length === 0) return;

  const service = createServiceClient();

  // Get current max position
  const { data: maxRow } = await service
    .from("collection_items")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  let nextPosition = (maxRow?.position ?? -1) + 1;

  const rows = mediaIds.map((media_id) => ({
    collection_id: collectionId,
    media_id,
    position: nextPosition++,
  }));

  const { error } = await service
    .from("collection_items")
    .upsert(rows, { onConflict: "collection_id,media_id" });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/collections");
}

export async function removeItemFromCollection(
  collectionId: string,
  mediaId: string
) {
  await verifyAdmin();

  const service = createServiceClient();

  const { error } = await service
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("media_id", mediaId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/collections");
}

export type SearchMediaResult = {
  id: string;
  media_type: string;
  thumbnail_url: string | null;
  media_url: string;
  title: string | null;
};

export async function searchMedia(
  query: string,
  excludeCollectionId?: string
): Promise<SearchMediaResult[]> {
  await verifyAdmin();

  const service = createServiceClient();

  // Search by title or ID
  let mediaQuery = service
    .from("media")
    .select("id, media_type, thumbnail_url, media_url, title")
    .order("created_at", { ascending: false })
    .limit(20);

  if (query) {
    mediaQuery = mediaQuery.or(`title.ilike.%${query}%,id.ilike.%${query}%`);
  }

  const { data: media } = await mediaQuery;
  if (!media || media.length === 0) return [];

  // If filtering for a collection, exclude already-added items
  if (excludeCollectionId) {
    const { data: existing } = await service
      .from("collection_items")
      .select("media_id")
      .eq("collection_id", excludeCollectionId);

    const existingIds = new Set((existing || []).map((e) => e.media_id));
    return media.filter((m) => !existingIds.has(m.id));
  }

  return media;
}
