import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
 * GET /api/search
 *
 * Filter media by tag values. All specified tags must match (AND logic).
 * Returns a cursor-paginated list of matching media with their tags.
 *
 * Query params:
 *   tags    - required; comma-separated tag values e.g. ?tags=blonde,beach
 *   cursor  - pagination cursor from a previous response
 *   limit   - items per page (default 20, max 100)
 *   type    - filter by media type: 'image' | 'video'
 *
 * Response:
 *   { data: MediaItem[], nextCursor: string | null, totalMatches: number }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tagsParam = searchParams.get("tags");
  if (!tagsParam) {
    return NextResponse.json(
      { error: "Missing required 'tags' query parameter" },
      { status: 400 }
    );
  }

  const tagValues = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tagValues.length === 0) {
    return NextResponse.json(
      { error: "At least one tag value is required" },
      { status: 400 }
    );
  }

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const cursor = searchParams.get("cursor");
  const mediaType = searchParams.get("type");
  const cursorCreatedAt = cursor ? decodeCursor(cursor) : null;

  const supabase = createServiceClient();

  // Resolve IDs matching ALL requested tag values
  const { data: matchingRows, error: tagError } = await supabase.rpc(
    "filter_media_by_tags",
    { tag_values: tagValues }
  );

  if (tagError) {
    return NextResponse.json({ error: tagError.message }, { status: 500 });
  }

  if (!matchingRows || matchingRows.length === 0) {
    return NextResponse.json({ data: [], nextCursor: null, totalMatches: 0 });
  }

  const matchingIds: string[] = matchingRows.map((r: { id: string }) => r.id);

  // Fetch paginated media for those IDs
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
    .in("id", matchingIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursorCreatedAt) {
    query = query.lt("created_at", cursorCreatedAt);
  }

  if (mediaType && ["image", "video"].includes(mediaType)) {
    query = query.eq("media_type", mediaType);
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

  return NextResponse.json({
    data: items,
    nextCursor,
    totalMatches: matchingIds.length,
  });
}
