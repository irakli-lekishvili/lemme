import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/media/:id
 *
 * Returns a single AI-tagged media item with its tags grouped by category.
 *
 * Response:
 *   {
 *     id, media_type, thumbnail_url, media_url, title, created_at,
 *     tags: { hair: ["blonde"], body: ["curvy"], ... }
 *   }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("media")
    .select(`
      id,
      media_type,
      thumbnail_url,
      media_url,
      title,
      created_at,
      media_tags (tag_category, tag_value)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Reshape flat tag rows into { category: [values] } map
  const tags: Record<string, string[]> = {};
  for (const { tag_category, tag_value } of data.media_tags as { tag_category: string; tag_value: string }[]) {
    if (!tags[tag_category]) tags[tag_category] = [];
    tags[tag_category].push(tag_value);
  }

  return NextResponse.json({ ...data, media_tags: undefined, tags });
}
