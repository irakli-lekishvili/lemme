import { createClient } from "@/lib/supabase/server";
import { uploadToCloudflare, deleteFromCloudflare, getCloudflareImageUrl } from "@/lib/cloudflare-images";
import {
  uploadToCloudflareStream,
  deleteFromCloudflareStream,
  getCloudflareStreamThumbnailUrl,
  SUPPORTED_VIDEO_TYPES,
  MAX_VIDEO_SIZE,
} from "@/lib/cloudflare-stream";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

type MediaType = "image" | "video" | "gif";

const MAX_MEDIA = 10;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function getMediaType(mimeType: string): MediaType {
  if (mimeType === "image/gif") return "gif";
  if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return "video";
  return "image";
}

function isValidMediaType(mimeType: string): boolean {
  return VALID_IMAGE_TYPES.includes(mimeType) || SUPPORTED_VIDEO_TYPES.includes(mimeType);
}

function getMaxFileSize(mimeType: string): number {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

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

  const formData = await request.formData();
  const fileCount = parseInt(formData.get("fileCount") as string, 10) || 0;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const categoriesJson = formData.get("categories") as string;
  const categoryIds: string[] = categoriesJson ? JSON.parse(categoriesJson) : [];

  // Collect all files
  const files: File[] = [];
  for (let i = 0; i < fileCount; i++) {
    const file = formData.get(`file_${i}`) as File;
    if (file) {
      files.push(file);
    }
  }

  // Backward compatibility: also check for single "file" field
  if (files.length === 0) {
    const singleFile = formData.get("file") as File;
    if (singleFile) {
      files.push(singleFile);
    }
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > MAX_MEDIA) {
    return NextResponse.json(
      { error: `Maximum ${MAX_MEDIA} files allowed per post` },
      { status: 400 }
    );
  }

  // Validate categories (at least one required)
  if (categoryIds.length === 0) {
    return NextResponse.json(
      { error: "At least one category is required" },
      { status: 400 }
    );
  }

  // Validate all files
  for (const file of files) {
    if (!isValidMediaType(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV." },
        { status: 400 }
      );
    }
    const maxSize = getMaxFileSize(file.type);
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxMB}MB.` },
        { status: 400 }
      );
    }
  }

  // Upload all files to Cloudflare (Images or Stream based on type)
  const uploadedMedia: {
    id: string;
    url: string;
    mediaType: MediaType;
    thumbnailUrl?: string;
  }[] = [];

  try {
    for (const file of files) {
      const mediaType = getMediaType(file.type);

      if (mediaType === "video") {
        // Upload to Cloudflare Stream
        const streamResult = await uploadToCloudflareStream(file);
        uploadedMedia.push({
          id: streamResult.uid,
          url: streamResult.playbackUrl,
          mediaType: "video",
          thumbnailUrl: getCloudflareStreamThumbnailUrl(streamResult.uid),
        });
      } else {
        // Upload to Cloudflare Images (including GIFs)
        const cloudflareResult = await uploadToCloudflare(file);
        const imageUrl = getCloudflareImageUrl(cloudflareResult.id, "large");
        uploadedMedia.push({
          id: cloudflareResult.id,
          url: imageUrl,
          mediaType,
        });
      }
    }
  } catch (error) {
    // Clean up any already uploaded media
    for (const media of uploadedMedia) {
      if (media.mediaType === "video") {
        await deleteFromCloudflareStream(media.id);
      } else {
        await deleteFromCloudflare(media.id);
      }
    }
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

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
    // Clean up uploaded media if post creation fails
    for (const media of uploadedMedia) {
      if (media.mediaType === "video") {
        await deleteFromCloudflareStream(media.id);
      } else {
        await deleteFromCloudflare(media.id);
      }
    }
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
