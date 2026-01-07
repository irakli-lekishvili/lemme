import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type DirectUploadResponse = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    uid: string;
    uploadURL: string;
  };
};

/**
 * Get a direct upload URL for Cloudflare Stream
 * Client will upload directly to Cloudflare, bypassing Vercel's size limits
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare Stream not configured" },
      { status: 500 }
    );
  }

  // Get file size from request body (required for TUS protocol)
  let maxDurationSeconds = 1800; // 30 minutes default
  let uploadLength = 0;
  try {
    const body = await request.json();
    if (body.maxDurationSeconds) {
      maxDurationSeconds = Math.min(body.maxDurationSeconds, 21600); // Max 6 hours
    }
    if (body.fileSize) {
      uploadLength = body.fileSize;
    }
  } catch {
    // No body or invalid JSON, use defaults
  }

  if (!uploadLength) {
    return NextResponse.json(
      { error: "fileSize is required" },
      { status: 400 }
    );
  }

  try {
    // Request a direct upload URL from Cloudflare Stream using TUS protocol
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Tus-Resumable": "1.0.0",
          "Upload-Length": uploadLength.toString(),
          "Upload-Metadata": `maxDurationSeconds ${Buffer.from(maxDurationSeconds.toString()).toString("base64")}`,
        },
      }
    );

    // For TUS protocol, the upload URL is in the Location header
    const uploadURL = response.headers.get("Location");
    const streamMediaId = response.headers.get("stream-media-id");

    if (!uploadURL || !streamMediaId) {
      // Try JSON response as fallback
      const data: DirectUploadResponse = await response.json();
      if (!data.success || !data.result) {
        const errorMessage = data.errors?.[0]?.message || "Failed to get upload URL";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
      }

      return NextResponse.json({
        uid: data.result.uid,
        uploadURL: data.result.uploadURL,
      });
    }

    return NextResponse.json({
      uid: streamMediaId,
      uploadURL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload URL request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
