import { Navbar } from "@/components/layout/navbar";
import { CollectionGrid } from "@/components/gallery/collection-grid";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type CollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  item_count: number;
};

type MediaItem = {
  id: string;
  media_type: string;
  thumbnail_url: string | null;
  media_url: string;
  title: string | null;
  position: number;
};

const PAGE_SIZE = 20;

async function getCollection(slug: string): Promise<{ collection: CollectionDetail; items: MediaItem[]; hasMore: boolean } | null> {
  const supabase = await createClient();

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, collection_items(count)")
    .eq("slug", slug)
    .single();

  if (collectionError || !collection) return null;

  const { data: items } = await supabase
    .from("collection_items")
    .select("position, media:media(id, media_type, thumbnail_url, media_url, title)")
    .eq("collection_id", collection.id)
    .order("position", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  const itemCount = (collection.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0;

  return {
    collection: {
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      cover_image_url: collection.cover_image_url,
      item_count: itemCount,
    },
    items: (items || []).map((i) => ({
      ...(i.media as unknown as Omit<MediaItem, "position">),
      position: i.position,
    })),
    hasMore: (items?.length || 0) === PAGE_SIZE,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getCollection(slug);

  if (!result) notFound();

  const { collection, items, hasMore } = result;

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[1800px] mx-auto px-6">
          {/* Collection header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary">{collection.name}</h1>
            {collection.description && (
              <p className="mt-2 text-text-secondary max-w-2xl">{collection.description}</p>
            )}
            <p className="mt-1 text-sm text-text-muted">
              {collection.item_count} {collection.item_count === 1 ? "item" : "items"}
            </p>
          </div>

          {/* Masonry grid */}
          <CollectionGrid
            collectionId={collection.id}
            initialItems={items}
            initialHasMore={hasMore}
          />
        </div>
      </main>

      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[1800px] mx-auto px-6">
          <p className="text-sm text-text-muted text-center">
            &copy; {new Date().getFullYear()} Lemme.Love. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
