import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { CollectionItemsManager } from "@/components/admin/collection-items-manager";

export type CollectionPostItem = {
  post_id: string;
  position: number;
  title: string | null;
  image_url: string;
  thumbnail_url: string | null;
  media_type: string | null;
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

  // Fetch current items with post data
  const { data: items } = await service
    .from("collection_items")
    .select("post_id, position, posts(id, title, image_url, thumbnail_url, media_type)")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true });

  const collectionItems: CollectionPostItem[] = (items || []).map((i) => {
    const p = i.posts as unknown as {
      id: string;
      title: string | null;
      image_url: string;
      thumbnail_url: string | null;
      media_type: string | null;
    };
    return {
      post_id: p.id,
      position: i.position,
      title: p.title,
      image_url: p.image_url,
      thumbnail_url: p.thumbnail_url,
      media_type: p.media_type,
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
