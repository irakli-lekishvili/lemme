import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { Images } from "lucide-react";
import Link from "next/link";

type PreviewItem = {
  src: string;
  thumbnail_url: string | null;
  media_type: string | null;
};

type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  item_count: number;
  preview_items: PreviewItem[];
};

async function getCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at, collection_items(count)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const collections = data.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    item_count: (c.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
    preview_items: [] as PreviewItem[],
  }));

  if (collections.length > 0) {
    const collectionIds = collections.map((c) => c.id);
    const { data: previewData } = await supabase
      .from("collection_items")
      .select("collection_id, position, posts(image_url, thumbnail_url, media_type)")
      .in("collection_id", collectionIds)
      .order("position", { ascending: true });

    if (previewData) {
      const grouped: Record<string, PreviewItem[]> = {};
      for (const item of previewData) {
        const cid = item.collection_id as string;
        if (!grouped[cid]) grouped[cid] = [];
        if (grouped[cid].length < 4) {
          const p = item.posts as unknown as {
            image_url: string;
            thumbnail_url: string | null;
            media_type: string | null;
          };
          if (p?.image_url) {
            grouped[cid].push({
              src: p.image_url,
              thumbnail_url: p.thumbnail_url,
              media_type: p.media_type,
            });
          }
        }
      }
      for (const col of collections) {
        col.preview_items = grouped[col.id] || [];
      }
    }
  }

  return collections;
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[470px] mx-auto px-4">
          <h1 className="text-2xl font-bold text-text-primary mb-8">Collections</h1>

          {collections.length === 0 ? (
            <div className="text-center py-20">
              <Images className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">No collections yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/c/${collection.slug}`}
                  className="group block bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden card-hover"
                >
                  {/* Cover image — full height, no crop */}
                  <div className="relative bg-black">
                    {collection.cover_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={collection.cover_image_url}
                        alt={collection.name}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                    ) : (
                      <div className="aspect-square flex items-center justify-center">
                        <Images className="w-10 h-10 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Preview strip — other items, smaller */}
                  {collection.preview_items.length > 0 && (
                    <div className="flex gap-0.5 bg-bg-base">
                      {collection.preview_items.slice(0, 3).map((item) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <div key={item.src} className="flex-1 aspect-square bg-bg-hover relative overflow-hidden">
                          <img
                            src={item.thumbnail_url || item.src}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                      {collection.item_count > 3 && (
                        <div className="flex-1 aspect-square bg-bg-hover flex items-center justify-center">
                          <span className="text-xs font-medium text-text-muted">
                            +{collection.item_count - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="px-4 py-3">
                    <h2 className="text-base font-semibold text-text-primary truncate">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="text-sm text-text-secondary truncate mt-0.5">
                        {collection.description}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      {collection.item_count} {collection.item_count === 1 ? "item" : "items"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[470px] mx-auto px-4">
          <p className="text-sm text-text-muted text-center">
            &copy; {new Date().getFullYear()} Lemme.Love. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
