import { Navbar } from "@/components/layout/navbar";
import { CollectionGrid } from "@/components/gallery/collection-grid";
import type { ImageItem } from "@/components/gallery/image-gallery";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type CollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  item_count: number;
};

const PAGE_SIZE = 20;

async function getCollection(slug: string): Promise<{ collection: CollectionDetail; items: ImageItem[]; hasMore: boolean } | null> {
  const supabase = await createClient();

  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, collection_items(count)")
    .eq("slug", slug)
    .single();

  if (collectionError || !collection) return null;

  const { data: items } = await supabase
    .from("collection_items")
    .select("position, posts(id, image_url, title, short_id, media_type, thumbnail_url, likes_count)")
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
    items: (items || []).map((i) => {
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

      <main className="pt-24 pb-16">
        <div className="max-w-[540px] mx-auto px-4">
          {/* Back link */}
          <Link
            href="/collections"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Collections
          </Link>

          {/* Collection header */}
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-2 text-sm text-text-secondary">
                {collection.description}
              </p>
            )}
            <p className="mt-1.5 text-xs text-text-muted">
              {collection.item_count} {collection.item_count === 1 ? "item" : "items"}
            </p>
          </div>

          {/* Feed */}
          <CollectionGrid
            collectionId={collection.id}
            initialItems={items}
            initialHasMore={hasMore}
          />
        </div>
      </main>
    </div>
  );
}
