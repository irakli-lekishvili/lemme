import { createClient } from "@/lib/supabase/server";
import { createMuxUploadUrl } from "@/lib/mux";
import { NextResponse } from "next/server";

/**
 * Get a direct upload URL for Mux Video
 * Client will upload directly to Mux, bypassing Vercel's size limits
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { uploadId, uploadUrl } = await createMuxUploadUrl();

    return NextResponse.json({
      uploadId,
      uploadUrl,
    });
  } catch (error) {
    console.error("Failed to create Mux upload URL:", error);
    const message = error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
