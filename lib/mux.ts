/**
 * Mux Video integration
 *
 * Setup required:
 * 1. Create a Mux account at https://mux.com
 * 2. Get your API credentials from Settings > API Access Tokens
 * 3. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your environment
 */

import Mux from "@mux/mux-node";

let muxClient: Mux | null = null;

export function getMuxClient(): Mux {
  if (!muxClient) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set");
    }

    muxClient = new Mux({
      tokenId,
      tokenSecret,
    });
  }
  return muxClient;
}

/**
 * Create a direct upload URL for client-side uploads
 */
export async function createMuxUploadUrl(): Promise<{
  uploadId: string;
  uploadUrl: string;
}> {
  const mux = getMuxClient();

  const upload = await mux.video.uploads.create({
    cors_origin: "*", // In production, set this to your domain
    new_asset_settings: {
      playback_policy: ["public"],
      encoding_tier: "baseline", // Use "smart" for better quality at higher cost
    },
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

/**
 * Get the status of an upload
 */
export async function getMuxUploadStatus(uploadId: string): Promise<{
  status: string;
  assetId?: string;
}> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.retrieve(uploadId);

  return {
    status: upload.status,
    assetId: upload.asset_id || undefined,
  };
}

/**
 * Get asset details including playback ID
 */
export async function getMuxAsset(assetId: string): Promise<{
  id: string;
  status: string;
  playbackId?: string;
  duration?: number;
}> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.retrieve(assetId);

  const publicPlayback = asset.playback_ids?.find((p) => p.policy === "public");

  return {
    id: asset.id,
    status: asset.status,
    playbackId: publicPlayback?.id,
    duration: asset.duration,
  };
}

/**
 * Delete a Mux asset
 */
export async function deleteMuxAsset(assetId: string): Promise<void> {
  const mux = getMuxClient();
  await mux.video.assets.delete(assetId);
}

/**
 * Get Mux playback URL for HLS streaming
 */
export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get Mux thumbnail URL
 */
export function getMuxThumbnailUrl(
  playbackId: string,
  options?: { time?: number; width?: number; height?: number }
): string {
  const params = new URLSearchParams();
  if (options?.time) params.set("time", options.time.toString());
  if (options?.width) params.set("width", options.width.toString());
  if (options?.height) params.set("height", options.height.toString());

  const queryString = params.toString();
  const base = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Get Mux animated GIF URL (for previews)
 */
export function getMuxGifUrl(
  playbackId: string,
  options?: { start?: number; end?: number; width?: number }
): string {
  const params = new URLSearchParams();
  if (options?.start) params.set("start", options.start.toString());
  if (options?.end) params.set("end", options.end.toString());
  if (options?.width) params.set("width", options.width.toString());

  const queryString = params.toString();
  const base = `https://image.mux.com/${playbackId}/animated.gif`;
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Import a video from URL (for migration)
 */
export async function importVideoFromUrl(url: string): Promise<{
  assetId: string;
}> {
  const mux = getMuxClient();

  const asset = await mux.video.assets.create({
    inputs: [{ url }],
    playback_policy: ["public"],
    encoding_tier: "baseline",
  });

  return {
    assetId: asset.id,
  };
}
