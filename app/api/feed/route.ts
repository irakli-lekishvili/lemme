import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Cursor encodes the last item's created_at for stable pagination
function encodeCursor(createdAt: string): string {
  return Buffer.from(createdAt).toString("base64url");
}

function decodeCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

/**
 * GET /api/feed
 *
 * Cursor-based paginated feed of AI-tagged media.
 *
 * Query params:
 *   cursor  - opaque cursor from previous response (for next page)
 *   limit   - items per page (default 20, max 100)
 *   type    - filter by media type: 'image' | 'video'
 *   tags    - comma-separated tag values, ALL must match (AND logic)
 *             e.g. ?tags=blonde,beach
 *
 * Response:
 *   { data: MediaItem[], nextCursor: string | null }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const cursor = searchParams.get("cursor");
  const tagsParam = searchParams.get("tags");
  const mediaType = searchParams.get("type");

  const cursorCreatedAt = cursor ? decodeCursor(cursor) : null;
  const supabase = createServiceClient();

  // When tags are requested, first resolve the matching media IDs
  let tagFilteredIds: string[] | null = null;
  if (tagsParam) {
    const tagValues = tagsParam
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tagValues.length > 0) {
      const { data, error } = await supabase.rpc("filter_media_by_tags", {
        tag_values: tagValues,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ data: [], nextCursor: null });
      }

      tagFilteredIds = data.map((r: { id: string }) => r.id);
    }
  }

  // Build the main query — fetch limit+1 to detect hasNextPage
  let query = supabase
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
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursorCreatedAt) {
    query = query.lt("created_at", cursorCreatedAt);
  }

  if (mediaType && ["image", "video"].includes(mediaType)) {
    query = query.eq("media_type", mediaType);
  }

  if (tagFilteredIds !== null) {
    query = query.in("id", tagFilteredIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasNextPage = (data?.length ?? 0) > limit;
  const items = hasNextPage ? data!.slice(0, limit) : (data ?? []);
  const lastItem = items[items.length - 1];
  const nextCursor =
    hasNextPage && lastItem ? encodeCursor(lastItem.created_at) : null;

  return NextResponse.json({ data: items, nextCursor });
}
