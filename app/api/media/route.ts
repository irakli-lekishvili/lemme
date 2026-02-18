import { nanoid } from "nanoid";
import { type NextRequest, NextResponse } from "next/server";
import { validateBearerToken } from "@/lib/auth/bearer";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportItem {
  /** Optional — stored as storage_path for reference */
  id?: string;
  media_type: "image" | "video";
  thumbnail_url?: string | null;
  /** The URL of the media (becomes image_url on post + post_images) */
  media_url: string;
  title?: string | null;
  created_at?: string | null;
  /** AI-generated tags: { hair: ["blonde"], body: ["curvy"], ... } */
  ai_tags?: Record<string, string[]> | null;
  /** 512-dim CLIP embedding as a plain number array */
  clip_embedding?: number[] | null;
}

// ---------------------------------------------------------------------------
// Shared insert logic — creates posts + post_images + tags + embeddings
// ---------------------------------------------------------------------------

async function insertBatch(
  supabase: ReturnType<typeof createServiceClient>,
  batch: ImportItem[]
) {
  const errors: { id: string; error: string }[] = [];

  // 1. Create a post for each item
  const postRows = batch.map((item) => ({
    user_id: null,
    title: item.title ?? null,
    image_url: item.media_url,
    storage_path: item.id ?? null,
    media_type: item.media_type,
    thumbnail_url: item.thumbnail_url ?? null,
    short_id: nanoid(8),
    ...(item.created_at ? { created_at: item.created_at } : {}),
  }));

  const { data: posts, error: postError } = await supabase
    .from("posts")
    .insert(postRows)
    .select("id");

  if (postError || !posts) {
    const msg = postError?.message ?? "Failed to insert posts";
    for (const item of batch) errors.push({ id: item.id ?? "unknown", error: msg });
    return { errors, postImageIds: [] };
  }

  // 2. Create a post_image for each post
  const postImageRows = posts.map((post, i) => ({
    post_id: post.id,
    image_url: batch[i].media_url,
    storage_path: batch[i].id ?? null,
    media_type: batch[i].media_type,
    thumbnail_url: batch[i].thumbnail_url ?? null,
    position: 0,
  }));

  const { data: postImages, error: imgError } = await supabase
    .from("post_images")
    .insert(postImageRows)
    .select("id");

  if (imgError || !postImages) {
    const msg = imgError?.message ?? "Failed to insert post_images";
    errors.push({ id: batch[0].id ?? "unknown", error: msg });
    return { errors, postImageIds: [] };
  }

  const postImageIds = postImages.map((pi) => pi.id as string);

  // 3. Insert tags into post_image_tags
  const tagRows: { post_image_id: string; tag_category: string; tag_value: string }[] = [];
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    if (!item.ai_tags) continue;
    for (const [category, values] of Object.entries(item.ai_tags)) {
      for (const value of values) {
        tagRows.push({
          post_image_id: postImageIds[i],
          tag_category: category,
          tag_value: value,
        });
      }
    }
  }

  if (tagRows.length > 0) {
    const { error: tagError } = await supabase
      .from("post_image_tags")
      .upsert(tagRows, { onConflict: "post_image_id,tag_category,tag_value" });
    if (tagError) errors.push({ id: batch[0].id ?? "unknown", error: `tags: ${tagError.message}` });
  }

  // 4. Insert embeddings into post_image_embeddings
  const embeddingRows = batch
    .map((item, i) => ({ item, postImageId: postImageIds[i] }))
    .filter(({ item }) => Array.isArray(item.clip_embedding) && item.clip_embedding.length === 512)
    .map(({ item, postImageId }) => ({
      post_image_id: postImageId,
      embedding: item.clip_embedding as number[],
    }));

  if (embeddingRows.length > 0) {
    const { error: embError } = await supabase
      .from("post_image_embeddings")
      .upsert(embeddingRows, { onConflict: "post_image_id" });
    if (embError) errors.push({ id: batch[0].id ?? "unknown", error: `embeddings: ${embError.message}` });
  }

  return { errors, postImageIds };
}

// ---------------------------------------------------------------------------
// POST /api/media — Import content as posts + post_images (admin, bearer-token)
//
// Single item:  body is a JSON object  → returns { data: ... }
// Bulk import:  body is a JSON array   → returns { inserted, errors[] }
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
  const rawItems: ImportItem[] = isSingle
    ? [body as ImportItem]
    : (body as ImportItem[]);

  if (!Array.isArray(rawItems)) {
    return NextResponse.json({ error: "Body must be an object or array" }, { status: 400 });
  }

  if (rawItems.length === 0) {
    return NextResponse.json(isSingle ? { error: "Empty body" } : { inserted: 0, errors: [] });
  }

  const supabase = createServiceClient();

  // Single-item path
  if (isSingle) {
    const { errors, postImageIds } = await insertBatch(supabase, rawItems);
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0].error }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("post_images")
      .select(`
        id, post_id, image_url, media_type, thumbnail_url, created_at,
        post_image_tags (tag_category, tag_value),
        posts (id, title, short_id)
      `)
      .eq("id", postImageIds[0])
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Insert succeeded but fetch failed" }, { status: 500 });
    }

    const tags: Record<string, string[]> = {};
    for (const { tag_category, tag_value } of data.post_image_tags as { tag_category: string; tag_value: string }[]) {
      if (!tags[tag_category]) tags[tag_category] = [];
      tags[tag_category].push(tag_value);
    }

    return NextResponse.json({
      data: { ...data, post_image_tags: undefined, tags },
    }, { status: 201 });
  }

  // Bulk path: process in batches
  const allErrors: { id: string; error: string }[] = [];
  let inserted = 0;

  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);
    const { errors } = await insertBatch(supabase, batch);
    allErrors.push(...errors);
    inserted += batch.length;
  }

  return NextResponse.json({
    inserted,
    errors: allErrors,
    ...(allErrors.length > 0 ? { warning: "Some items had errors — see errors[]" } : {}),
  });
}

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET /api/media — List posts with pagination (admin, bearer-token)
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const authResult = validateBearerToken(request);
  if (!authResult.success) return authResult.response;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10))
  );
  const offset = (page - 1) * limit;
  const mediaType = searchParams.get("type");

  const supabase = createServiceClient();

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

  if (mediaType && ["image", "video", "gif"].includes(mediaType)) {
    query = query.eq("media_type", mediaType);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return NextResponse.json({
    data: posts,
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
