import { type NextRequest, NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/auth/bearer";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// POST /api/collections/:slug/items — add posts to a collection (admin)
// Body: { items: [{ post_id, position? }] }
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const authResult = validateBearerToken(request);
  if (!authResult.success) return authResult.response;

  const { slug } = await params;

  let body: { items?: { post_id: string; position?: number }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "items array is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve collection by slug
  const { data: collection, error: collectionError } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", slug)
    .single();

  if (collectionError || !collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Get current max position for auto-incrementing
  const { data: maxRow } = await supabase
    .from("collection_items")
    .select("position")
    .eq("collection_id", collection.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  let nextPosition = (maxRow?.position ?? -1) + 1;

  const rows = body.items.map((item) => ({
    collection_id: collection.id,
    post_id: item.post_id,
    position: item.position ?? nextPosition++,
  }));

  const { error: insertError } = await supabase
    .from("collection_items")
    .upsert(rows, { onConflict: "collection_id,post_id" });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: rows.length }, { status: 201 });
}
