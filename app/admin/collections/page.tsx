import { createServiceClient } from "@/lib/supabase/service";
import { FolderOpen } from "lucide-react";
import { CollectionsList } from "@/components/admin/collections-list";

export type AdminCollection = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  item_count: number;
};

export default async function AdminCollectionsPage() {
  const service = createServiceClient();

  const { data, error } = await service
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at, collection_items(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-error-400">
        Failed to load collections: {error.message}
      </div>
    );
  }

  const collections: AdminCollection[] = (data || []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    item_count: (c.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Collections</h2>
          <p className="text-sm text-text-muted mt-1">
            {collections.length} {collections.length === 1 ? "collection" : "collections"}
          </p>
        </div>
      </div>

      {collections.length === 0 && (
        <div className="bg-bg-card border border-border-subtle rounded-xl p-12 text-center mb-6">
          <FolderOpen className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-text-muted">No collections yet. Create one below.</p>
        </div>
      )}

      <CollectionsList collections={collections} />
    </div>
  );
}
