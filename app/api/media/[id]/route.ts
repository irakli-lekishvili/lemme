import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/media/:id
 *
 * Returns a single post image with its tags grouped by category.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("post_images")
    .select(`
      id,
      post_id,
      image_url,
      media_type,
      thumbnail_url,
      created_at,
      post_image_tags (tag_category, tag_value),
      posts (id, title, short_id, description)
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tags: Record<string, string[]> = {};
  for (const { tag_category, tag_value } of data.post_image_tags as { tag_category: string; tag_value: string }[]) {
    if (!tags[tag_category]) tags[tag_category] = [];
    tags[tag_category].push(tag_value);
  }

  return NextResponse.json({ ...data, post_image_tags: undefined, tags });
}
