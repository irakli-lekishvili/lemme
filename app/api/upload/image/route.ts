import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type DirectUploadResponse = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    id: string;
    uploadURL: string;
  };
};

/**
 * Get a direct upload URL for Cloudflare Images
 * Client will upload directly to Cloudflare, bypassing Vercel's size limits
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare Images not configured" },
      { status: 500 }
    );
  }

  try {
    // Request a direct upload URL from Cloudflare
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requireSignedURLs: false,
          metadata: {
            userId: user.id,
          },
        }),
      }
    );

    const data: DirectUploadResponse = await response.json();

    if (!data.success || !data.result) {
      const errorMessage = data.errors?.[0]?.message || "Failed to get upload URL";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json({
      id: data.result.id,
      uploadURL: data.result.uploadURL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload URL request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
