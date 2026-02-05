import { createServiceClient } from "@/lib/supabase/service";
import { validateBearerToken } from "@/lib/auth/bearer";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  // Validate bearer token
  const authResult = validateBearerToken(request);
  if (!authResult.success) {
    return authResult.response;
  }

  // Parse pagination parameters
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;

  // Optional filters
  const mediaType = searchParams.get("type"); // 'image', 'video', 'gif'

  const supabase = createServiceClient();

  // Build query for posts with their media
  let query = supabase
    .from("posts")
    .select(
      `
      id,
      user_id,
      title,
      description,
      image_url,
      storage_path,
      media_type,
      thumbnail_url,
      short_id,
      likes_count,
      created_at,
      updated_at,
      post_images (
        id,
        image_url,
        storage_path,
        media_type,
        thumbnail_url,
        position
      ),
      post_categories (
        category_id,
        categories (
          id,
          name,
          slug,
          icon,
          color
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply media type filter if specified
  if (mediaType && ["image", "video", "gif"].includes(mediaType)) {
    query = query.eq("media_type", mediaType);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    console.error("Failed to fetch media:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate pagination metadata
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return NextResponse.json({
    data: posts,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  });
}
