import { createClient } from "@/lib/supabase/server";
import { getMuxAsset, getMuxUploadStatus } from "@/lib/mux";
import { NextResponse } from "next/server";

/**
 * Check the status of a Mux video upload/asset
 */
export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get("uploadId");

  if (!uploadId) {
    return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
  }

  try {
    // First check upload status
    const upload = await getMuxUploadStatus(uploadId);

    if (upload.status === "waiting") {
      return NextResponse.json({ state: "waiting" });
    }

    if (upload.status === "errored") {
      return NextResponse.json({
        state: "error",
        errorReasonText: "Upload failed",
      });
    }

    // If asset is created, check asset status
    if (upload.assetId) {
      const asset = await getMuxAsset(upload.assetId);

      if (asset.status === "ready" && asset.playbackId) {
        return NextResponse.json({
          state: "ready",
          assetId: asset.id,
          playbackId: asset.playbackId,
          duration: asset.duration,
        });
      }

      if (asset.status === "errored") {
        return NextResponse.json({
          state: "error",
          errorReasonText: "Video processing failed",
        });
      }

      // Still processing
      return NextResponse.json({
        state: "processing",
        assetId: asset.id,
      });
    }

    // Upload complete but asset not yet created
    return NextResponse.json({ state: "processing" });
  } catch (error) {
    console.error("Failed to get Mux status:", error);
    const message = error instanceof Error ? error.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
