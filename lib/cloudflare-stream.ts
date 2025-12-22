/**
 * Cloudflare Stream integration
 *
 * Provides upload and delivery URL generation for video content.
 *
 * Setup required:
 * 1. Get your Account ID from Cloudflare Dashboard
 * 2. Create an API token with Stream:Edit permission
 * 3. Enable Stream on your Cloudflare account
 */

type CloudflareStreamUploadResponse = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    uid: string;
    thumbnail: string;
    playback: {
      hls: string;
      dash: string;
    };
    preview: string;
    status: {
      state: string;
    };
  };
};

type CloudflareStreamStatusResponse = {
  success: boolean;
  result?: {
    uid: string;
    status: {
      state: "queued" | "inprogress" | "ready" | "error";
      pctComplete?: string;
    };
    playback: {
      hls: string;
      dash: string;
    };
    thumbnail: string;
    preview: string;
    duration: number;
  };
};

/**
 * Upload a video to Cloudflare Stream
 */
export async function uploadToCloudflareStream(
  file: File
): Promise<{ uid: string; thumbnail: string; playbackUrl: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream credentials not configured");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    }
  );

  const data: CloudflareStreamUploadResponse = await response.json();

  if (!data.success || !data.result) {
    const errorMessage = data.errors?.[0]?.message || "Video upload failed";
    throw new Error(errorMessage);
  }

  return {
    uid: data.result.uid,
    thumbnail: data.result.thumbnail,
    playbackUrl: data.result.playback.hls,
  };
}

/**
 * Delete a video from Cloudflare Stream
 */
export async function deleteFromCloudflareStream(videoId: string): Promise<boolean> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream credentials not configured");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  const data = await response.json();
  return data.success;
}

/**
 * Get the status of a video upload
 */
export async function getCloudflareStreamStatus(
  videoId: string
): Promise<CloudflareStreamStatusResponse["result"]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Stream credentials not configured");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  const data: CloudflareStreamStatusResponse = await response.json();

  if (!data.success || !data.result) {
    throw new Error("Failed to get video status");
  }

  return data.result;
}

/**
 * Get the Cloudflare Stream embed URL for a video
 */
export function getCloudflareStreamEmbedUrl(videoId: string): string {
  return `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;
}

/**
 * Get the Cloudflare Stream HLS playback URL
 */
export function getCloudflareStreamPlaybackUrl(videoId: string): string {
  return `https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * Get the thumbnail URL for a video
 */
export function getCloudflareStreamThumbnailUrl(
  videoId: string,
  options?: { time?: string; width?: number; height?: number }
): string {
  const subdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN;
  let url = `https://customer-${subdomain}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

  const params = new URLSearchParams();
  if (options?.time) params.set("time", options.time);
  if (options?.width) params.set("width", options.width.toString());
  if (options?.height) params.set("height", options.height.toString());

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Check if a URL is a Cloudflare Stream URL
 */
export function isCloudflareStreamUrl(url: string): boolean {
  return url.includes("cloudflarestream.com");
}

/**
 * Extract video ID from Cloudflare Stream URL
 */
export function extractCloudflareStreamId(url: string): string | null {
  const match = url.match(/cloudflarestream\.com\/([a-f0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Supported video types for upload
 */
export const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

/**
 * Max video file size (100MB for direct upload, use TUS for larger)
 */
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
