import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { CollectionItemsManager } from "@/components/admin/collection-items-manager";

export type CollectionItem = {
  media_id: string;
  position: number;
  media_type: string;
  thumbnail_url: string | null;
  media_url: string;
  title: string | null;
};

export default async function AdminCollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = createServiceClient();

  const { data: collection, error } = await service
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at")
    .eq("slug", slug)
    .single();

  if (error || !collection) notFound();

  // Fetch current items
  const { data: items } = await service
    .from("collection_items")
    .select("media_id, position, media:media(id, media_type, thumbnail_url, media_url, title)")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true });

  const collectionItems: CollectionItem[] = (items || []).map((i) => {
    const m = i.media as unknown as {
      id: string;
      media_type: string;
      thumbnail_url: string | null;
      media_url: string;
      title: string | null;
    };
    return {
      media_id: m.id,
      position: i.position,
      media_type: m.media_type,
      thumbnail_url: m.thumbnail_url,
      media_url: m.media_url,
      title: m.title,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary">{collection.name}</h2>
        <p className="text-sm text-text-muted mt-1">
          /{collection.slug} &middot; {collectionItems.length} items
        </p>
      </div>

      <CollectionItemsManager
        collectionId={collection.id}
        collectionSlug={collection.slug}
        items={collectionItems}
      />
    </div>
  );
}
