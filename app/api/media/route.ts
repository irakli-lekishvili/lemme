import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/auth/bearer";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MediaImportItem {
  /** Optional — auto-generated with nanoid when omitted */
  id?: string;
  media_type: "image" | "video";
  thumbnail_url?: string | null;
  media_url: string;
  title?: string | null;
  created_at?: string | null;
  /** AI-generated tags: { hair: ["blonde"], body: ["curvy"], ... } */
  ai_tags?: Record<string, string[]> | null;
  /** 512-dim CLIP embedding as a plain number array */
  clip_embedding?: number[] | null;
}

// ---------------------------------------------------------------------------
// Shared insert logic
// ---------------------------------------------------------------------------

async function insertBatch(
  supabase: ReturnType<typeof createServiceClient>,
  batch: (MediaImportItem & { id: string })[]
) {
  const errors: { id: string; error: string }[] = [];

  // 1. Upsert media rows
  const mediaRows = batch.map(({ id, media_type, thumbnail_url, media_url, title, created_at }) => ({
    id,
    media_type,
    thumbnail_url: thumbnail_url ?? null,
    media_url,
    title: title ?? null,
    ...(created_at ? { created_at } : {}),
  }));

  const { error: mediaError } = await supabase
    .from("media")
    .upsert(mediaRows, { onConflict: "id" });

  if (mediaError) {
    for (const row of batch) errors.push({ id: row.id, error: mediaError.message });
    return errors;
  }

  // 2. Upsert tags
  const tagRows: { media_id: string; tag_category: string; tag_value: string }[] = [];
  for (const item of batch) {
    if (!item.ai_tags) continue;
    for (const [category, values] of Object.entries(item.ai_tags)) {
      for (const value of values) {
        tagRows.push({ media_id: item.id, tag_category: category, tag_value: value });
      }
    }
  }

  if (tagRows.length > 0) {
    const { error: tagError } = await supabase
      .from("media_tags")
      .upsert(tagRows, { onConflict: "media_id,tag_category,tag_value" });
    if (tagError) errors.push({ id: batch[0].id, error: `tags: ${tagError.message}` });
  }

  // 3. Upsert embeddings
  const embeddingRows = batch
    .filter((item) => Array.isArray(item.clip_embedding) && item.clip_embedding.length === 512)
    .map((item) => ({ media_id: item.id, embedding: item.clip_embedding as number[] }));

  if (embeddingRows.length > 0) {
    const { error: embError } = await supabase
      .from("media_embeddings")
      .upsert(embeddingRows, { onConflict: "media_id" });
    if (embError) errors.push({ id: batch[0].id, error: `embeddings: ${embError.message}` });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// POST /api/media — Create one item or bulk-import many (admin, bearer-token)
//
// Single item:  body is a JSON object  → returns { data: MediaItem }
// Bulk import:  body is a JSON array   → returns { inserted, errors[] }
//
// In both cases `id` is optional and auto-generated when omitted.
// Fields: id?, media_type, media_url, thumbnail_url?, title?,
//         created_at?, ai_tags?, clip_embedding?
// ---------------------------------------------------------------------------

const BATCH_SIZE = 50;

export async function POST(request: NextRequest) {
  const authResult = validateBearerToken(request);
  if (!authResult.success) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isSingle = !Array.isArray(body) && typeof body === "object" && body !== null;
  const rawItems: MediaImportItem[] = isSingle
    ? [body as MediaImportItem]
    : (body as MediaImportItem[]);

  if (!Array.isArray(rawItems)) {
    return NextResponse.json({ error: "Body must be an object or array" }, { status: 400 });
  }

  // Assign IDs where missing
  const items = rawItems.map((item) => ({ ...item, id: item.id ?? nanoid() }));

  if (items.length === 0) {
    return NextResponse.json(isSingle ? { error: "Empty body" } : { inserted: 0, errors: [] });
  }

  const supabase = createServiceClient();

  // Single-item path: insert and return the created record
  if (isSingle) {
    const errors = await insertBatch(supabase, items as (MediaImportItem & { id: string })[]);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0].error }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("media")
      .select(`id, media_type, thumbnail_url, media_url, title, created_at, media_tags (tag_category, tag_value)`)
      .eq("id", items[0].id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Insert succeeded but fetch failed" }, { status: 500 });
    }

    const tags: Record<string, string[]> = {};
    for (const { tag_category, tag_value } of data.media_tags as { tag_category: string; tag_value: string }[]) {
      if (!tags[tag_category]) tags[tag_category] = [];
      tags[tag_category].push(tag_value);
    }

    return NextResponse.json({ data: { ...data, media_tags: undefined, tags } }, { status: 201 });
  }

  // Bulk path: process in batches
  const allErrors: { id: string; error: string }[] = [];
  let inserted = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE) as (MediaImportItem & { id: string })[];
    const batchErrors = await insertBatch(supabase, batch);
    allErrors.push(...batchErrors);
    inserted += batch.length;
  }

  return NextResponse.json({
    inserted,
    errors: allErrors,
    ...(allErrors.length > 0 ? { warning: "Some items had errors — see errors[]" } : {}),
  });
}

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
