import { createClient } from "@/lib/supabase/server";
import { getCloudflareImageUrl } from "@/lib/cloudflare-images";
import { getMuxPlaybackUrl, getMuxThumbnailUrl } from "@/lib/mux";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

type MediaType = "image" | "video" | "gif";

type MediaInput = {
  cloudflareId: string;
  type: MediaType;
};

const MAX_MEDIA = 10;

export async function GET() {
  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON body (files are already uploaded to Cloudflare)
  const body = await request.json();
  const { media, title, description, categories: categoryIds } = body as {
    media: MediaInput[];
    title?: string;
    description?: string;
    categories: string[];
  };

  if (!media || media.length === 0) {
    return NextResponse.json({ error: "No media provided" }, { status: 400 });
  }

  if (media.length > MAX_MEDIA) {
    return NextResponse.json(
      { error: `Maximum ${MAX_MEDIA} files allowed per post` },
      { status: 400 }
    );
  }

  // Validate categories (at least one required)
  if (!categoryIds || categoryIds.length === 0) {
    return NextResponse.json(
      { error: "At least one category is required" },
      { status: 400 }
    );
  }

  // Build media data from uploaded IDs (Mux playbackId for videos, Cloudflare ID for images)
  const uploadedMedia: {
    id: string;
    url: string;
    mediaType: MediaType;
    thumbnailUrl?: string;
  }[] = media.map((item) => {
    if (item.type === "video") {
      // For videos, cloudflareId is actually the Mux playbackId
      const playbackId = item.cloudflareId;
      return {
        id: playbackId,
        url: getMuxPlaybackUrl(playbackId),
        mediaType: "video" as MediaType,
        thumbnailUrl: getMuxThumbnailUrl(playbackId),
      };
    } else {
      return {
        id: item.cloudflareId,
        url: getCloudflareImageUrl(item.cloudflareId, "large"),
        mediaType: item.type,
      };
    }
  });

  // Generate short ID for user-friendly URLs (8 chars)
  const short_id = nanoid(8);

  // Use first media item as the cover/primary
  const coverMedia = uploadedMedia[0];

  // Create post record
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title: title || null,
      description: description || null,
      image_url: coverMedia.url,
      storage_path: coverMedia.id,
      media_type: coverMedia.mediaType,
      thumbnail_url: coverMedia.thumbnailUrl || null,
      short_id,
    })
    .select()
    .single();

  if (postError) {
    // Note: Media already uploaded to Cloudflare will remain (orphaned)
    // Could implement cleanup via a background job if needed
    console.error("Failed to create post:", postError);
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  // Add all media to post_images table (including the cover for consistency)
  const postImages = uploadedMedia.map((media, index) => ({
    post_id: post.id,
    image_url: media.url,
    storage_path: media.id,
    media_type: media.mediaType,
    thumbnail_url: media.thumbnailUrl || null,
    position: index,
  }));

  const { error: imagesError } = await supabase
    .from("post_images")
    .insert(postImages);

  if (imagesError) {
    // Log error but don't fail the request - the post was created
    console.error("Failed to insert post_images:", imagesError);
  }

  // Add categories if provided
  if (categoryIds.length > 0) {
    const postCategories = categoryIds.map((categoryId) => ({
      post_id: post.id,
      category_id: categoryId,
    }));

    await supabase.from("post_categories").insert(postCategories);
  }

  return NextResponse.json(post, { status: 201 });
}
