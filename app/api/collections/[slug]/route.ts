import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/collections/:slug — get collection with paginated items
// Query params: ?page=1&limit=20
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  // Fetch the collection
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at")
    .eq("slug", slug)
    .single();

  if (collectionError || !collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Fetch paginated items with media details
  const { data: items, error: itemsError, count } = await supabase
    .from("collection_items")
    .select(
      "position, media:media(id, media_type, thumbnail_url, media_url, title, created_at)",
      { count: "exact" }
    )
    .eq("collection_id", collection.id)
    .order("position", { ascending: true })
    .range(offset, offset + limit - 1);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return NextResponse.json({
    data: {
      ...collection,
      item_count: totalItems,
      items: (items || []).map((i) => ({
        ...i.media,
        position: i.position,
      })),
    },
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}
