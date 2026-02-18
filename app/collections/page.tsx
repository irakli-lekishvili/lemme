import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { Images } from "lucide-react";
import Link from "next/link";

type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  item_count: number;
};

async function getCollections(): Promise<Collection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at, collection_items(count)")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    item_count: (c.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
}

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[1800px] mx-auto px-6">
          <h1 className="text-2xl font-bold text-text-primary mb-8">Collections</h1>

          {collections.length === 0 ? (
            <div className="text-center py-20">
              <Images className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">No collections yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/c/${collection.slug}`}
                  className="group block"
                >
                  <div className="image-card card-hover relative aspect-[4/3] bg-bg-elevated">
                    {collection.cover_image_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={collection.cover_image_url}
                        alt={collection.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Images className="w-10 h-10 text-text-muted" />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h2 className="text-lg font-semibold text-white truncate">
                        {collection.name}
                      </h2>
                      <p className="text-sm text-white/70">
                        {collection.item_count} {collection.item_count === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
