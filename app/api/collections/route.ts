import { type NextRequest, NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/auth/bearer";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// GET /api/collections — list all collections with cover image + item count
// ---------------------------------------------------------------------------

export async function GET() {
  const supabase = await createClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, slug, name, description, cover_image_url, created_at, collection_items(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = (collections || []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    cover_image_url: c.cover_image_url,
    created_at: c.created_at,
    item_count: (c.collection_items as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return NextResponse.json({ data: result });
}

// ---------------------------------------------------------------------------
// POST /api/collections — create a new collection (admin, bearer auth)
// Body: { slug, name, description?, cover_image_url? }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = validateBearerToken(request);
  if (!authResult.success) return authResult.response;

  let body: { slug?: string; name?: string; description?: string; cover_image_url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.slug || !body.name) {
    return NextResponse.json({ error: "slug and name are required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("collections")
    .insert({
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      cover_image_url: body.cover_image_url ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A collection with this slug already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
