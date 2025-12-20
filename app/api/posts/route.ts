import { createClient } from "@/lib/supabase/server";
import { uploadToCloudflare, deleteFromCloudflare, getCloudflareImageUrl } from "@/lib/cloudflare-images";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

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
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const categoriesJson = formData.get("categories") as string;
  const categoryIds: string[] = categoriesJson ? JSON.parse(categoriesJson) : [];

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate categories (at least one required)
  if (categoryIds.length === 0) {
    return NextResponse.json(
      { error: "At least one category is required" },
      { status: 400 }
    );
  }

  // Validate file type
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
      { status: 400 }
    );
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  // Upload to Cloudflare Images
  let cloudflareResult: { id: string; variants: string[] };
  try {
    cloudflareResult = await uploadToCloudflare(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Get the delivery URL (using 'large' variant as the stored URL)
  const imageUrl = getCloudflareImageUrl(cloudflareResult.id, "large");

  // Generate short ID for user-friendly URLs (8 chars)
  const short_id = nanoid(8);

  // Create post record
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title: title || null,
      description: description || null,
      image_url: imageUrl,
      storage_path: cloudflareResult.id, // Store CF image ID for cleanup
      short_id,
    })
    .select()
    .single();

  if (postError) {
    // Clean up uploaded image if post creation fails
    await deleteFromCloudflare(cloudflareResult.id);
    return NextResponse.json({ error: postError.message }, { status: 500 });
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
