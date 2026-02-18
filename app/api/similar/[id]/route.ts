import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * GET /api/similar/:id
 *
 * Returns post images most similar to the given item using
 * cosine distance on 512-dim CLIP embeddings (pgvector).
 *
 * Query params:
 *   limit - number of results (default 10, max 50)
 *
 * Response:
 *   { data: SimilarItem[] }
 *   where SimilarItem includes a `similarity` score (0–1)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );

  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("find_similar_post_images", {
    query_post_image_id: id,
    match_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    const { count } = await supabase
      .from("post_images")
      .select("id", { count: "exact", head: true })
      .eq("id", id);

    if (!count) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: [] });
  }

  return NextResponse.json({ data });
}
