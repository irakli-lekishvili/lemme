import { createClient } from "@/lib/supabase/server";
import { uploadToCloudflare, deleteFromCloudflare, getCloudflareImageUrl } from "@/lib/cloudflare-images";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const MAX_IMAGES = 10;

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

  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES} images allowed per post` },
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
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxSize = 10 * 1024 * 1024;

  for (const file of files) {
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }
  }

  // Upload all files to Cloudflare Images
  const uploadedImages: { id: string; url: string }[] = [];
  try {
    for (const file of files) {
      const cloudflareResult = await uploadToCloudflare(file);
      const imageUrl = getCloudflareImageUrl(cloudflareResult.id, "large");
      uploadedImages.push({ id: cloudflareResult.id, url: imageUrl });
    }
  } catch (error) {
    // Clean up any already uploaded images
    for (const img of uploadedImages) {
      await deleteFromCloudflare(img.id);
    }
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Generate short ID for user-friendly URLs (8 chars)
  const short_id = nanoid(8);

  // Use first image as the cover/primary image
  const coverImage = uploadedImages[0];

  // Create post record
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title: title || null,
      description: description || null,
      image_url: coverImage.url,
      storage_path: coverImage.id,
      short_id,
    })
    .select()
    .single();

  if (postError) {
    // Clean up uploaded images if post creation fails
    for (const img of uploadedImages) {
      await deleteFromCloudflare(img.id);
    }
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  // Add all images to post_images table (including the cover for consistency)
  const postImages = uploadedImages.map((img, index) => ({
    post_id: post.id,
    image_url: img.url,
    storage_path: img.id,
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
