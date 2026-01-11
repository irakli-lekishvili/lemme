/**
 * Migration script: Cloudflare Stream → Mux
 *
 * This script migrates existing videos from Cloudflare Stream to Mux.
 * It downloads videos locally first, then uploads to Mux (since Mux can't
 * access Cloudflare's protected download URLs).
 *
 * Usage:
 *   npx tsx scripts/migrate-cloudflare-to-mux.ts
 *
 * Required environment variables:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (not anon key - needs full access)
 *   - CLOUDFLARE_ACCOUNT_ID
 *   - CLOUDFLARE_STREAM_API_TOKEN
 *   - MUX_TOKEN_ID
 *   - MUX_TOKEN_SECRET
 */

import { createClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Load environment variables
import "dotenv/config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error("Missing Cloudflare credentials");
  process.exit(1);
}

if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error("Missing Mux credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

// Temp directory for downloads
const TEMP_DIR = path.join(os.tmpdir(), "cf-mux-migration");

interface VideoPost {
  id: string;
  image_url: string;
  storage_path: string;
  thumbnail_url: string | null;
}

interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  storage_path: string;
  thumbnail_url: string | null;
  media_type: string;
}

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Download video from Cloudflare Stream to local file
 */
async function downloadFromCloudflare(videoId: string): Promise<string | null> {
  try {
    // Step 1: Enable downloads for the video
    console.log(`  Enabling downloads for ${videoId}...`);
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta: { downloadable: true },
        }),
      }
    );

    // Step 2: Request download URL creation
    console.log(`  Requesting download URL...`);
    const downloadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}/downloads`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    let downloadData = await downloadResponse.json();

    // If POST fails, try GET (download might already exist)
    if (!downloadData.success || !downloadData.result?.default?.url) {
      const getResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}/downloads`,
        {
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
          },
        }
      );
      downloadData = await getResponse.json();
    }

    if (!downloadData.success || !downloadData.result?.default?.url) {
      console.log(`  Could not get download URL:`, JSON.stringify(downloadData));
      return null;
    }

    const downloadUrl = downloadData.result.default.url;

    // Wait for download to be ready if in progress
    if (downloadData.result.default.status === "inprogress") {
      console.log(`  Waiting for Cloudflare to prepare download...`);
      // Poll until ready (max 2 minutes)
      for (let i = 0; i < 24; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}/downloads`,
          {
            headers: {
              Authorization: `Bearer ${CF_API_TOKEN}`,
            },
          }
        );
        const statusData = await statusResponse.json();
        if (statusData.result?.default?.status === "ready") {
          console.log(`  Download ready!`);
          break;
        }
        console.log(`  Still preparing... (${(i + 1) * 5}s)`);
      }
    }

    // Step 3: Download the file
    console.log(`  Downloading video...`);
    const fileResponse = await fetch(downloadUrl);

    if (!fileResponse.ok) {
      console.log(`  Download failed: ${fileResponse.status} ${fileResponse.statusText}`);
      return null;
    }

    const localPath = path.join(TEMP_DIR, `${videoId}.mp4`);
    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(localPath, buffer);

    const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`  Downloaded ${fileSizeMB}MB to ${localPath}`);

    return localPath;
  } catch (error) {
    console.error(`  Failed to download from Cloudflare:`, error);
    return null;
  }
}

/**
 * Upload video to Mux using direct upload
 */
async function uploadToMux(localFilePath: string): Promise<{ playbackId: string; assetId: string } | null> {
  try {
    // Step 1: Create direct upload URL
    console.log(`  Creating Mux upload URL...`);
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline",
      },
      cors_origin: "*",
    });

    const uploadUrl = upload.url;
    const uploadId = upload.id;

    // Step 2: Upload the file
    console.log(`  Uploading to Mux...`);
    const fileBuffer = fs.readFileSync(localFilePath);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": "video/mp4",
      },
    });

    if (!uploadResponse.ok) {
      console.error(`  Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      return null;
    }

    console.log(`  Upload complete. Waiting for processing...`);

    // Step 3: Wait for asset to be created and ready
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const uploadStatus = await mux.video.uploads.retrieve(uploadId);

      if (uploadStatus.asset_id) {
        const asset = await mux.video.assets.retrieve(uploadStatus.asset_id);

        if (asset.status === "ready") {
          const playbackId = asset.playback_ids?.find((p) => p.policy === "public")?.id;
          if (playbackId) {
            console.log(`  Mux asset ready. Playback ID: ${playbackId}`);
            return { playbackId, assetId: asset.id };
          }
        }

        if (asset.status === "errored") {
          console.error(`  Mux asset errored: ${JSON.stringify(asset.errors)}`);
          return null;
        }

        console.log(`  Processing... (status: ${asset.status})`);
      } else {
        console.log(`  Waiting for asset creation...`);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    console.error(`  Mux processing timed out`);
    return null;
  } catch (error) {
    console.error(`  Failed to upload to Mux:`, error);
    return null;
  }
}

/**
 * Clean up temporary file
 */
function cleanupTempFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Extract Cloudflare video ID from URL or storage_path
 */
function extractCloudflareVideoId(urlOrPath: string): string | null {
  // Try to match cloudflarestream.com URL pattern
  const urlMatch = urlOrPath.match(/cloudflarestream\.com\/([a-f0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // If it's just the video ID (storage_path)
  if (/^[a-f0-9]{32}$/.test(urlOrPath)) return urlOrPath;

  return null;
}

async function migrateVideos() {
  console.log("=== Cloudflare Stream → Mux Migration ===");
  console.log("Using local download + upload method\n");

  ensureTempDir();
  console.log(`Temp directory: ${TEMP_DIR}\n`);

  // Get all video posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, image_url, storage_path, thumbnail_url")
    .eq("media_type", "video");

  if (postsError) {
    console.error("Failed to fetch posts:", postsError);
    return;
  }

  console.log(`Found ${posts?.length || 0} video posts to migrate\n`);

  // Get all video post_images
  const { data: postImages, error: imagesError } = await supabase
    .from("post_images")
    .select("id, post_id, image_url, storage_path, thumbnail_url, media_type")
    .eq("media_type", "video");

  if (imagesError) {
    console.error("Failed to fetch post_images:", imagesError);
    return;
  }

  console.log(`Found ${postImages?.length || 0} video entries in post_images\n`);

  const migrated: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  // Track already migrated Cloudflare IDs to avoid duplicate work
  const migratedCfIds = new Map<string, { playbackId: string; assetId: string }>();

  // Migrate posts
  for (const post of (posts || []) as VideoPost[]) {
    console.log(`\nMigrating post ${post.id}...`);

    // Skip if already migrated to Mux
    if (post.image_url.includes("stream.mux.com")) {
      console.log("  Already migrated to Mux, skipping");
      skipped.push(post.id);
      continue;
    }

    const videoId = extractCloudflareVideoId(post.storage_path || post.image_url);
    if (!videoId) {
      console.log(`  Could not extract Cloudflare video ID, skipping`);
      failed.push(post.id);
      continue;
    }

    console.log(`  Cloudflare video ID: ${videoId}`);

    let muxResult = migratedCfIds.get(videoId);

    if (!muxResult) {
      // Download from Cloudflare
      const localPath = await downloadFromCloudflare(videoId);
      if (!localPath) {
        failed.push(post.id);
        continue;
      }

      // Upload to Mux
      muxResult = await uploadToMux(localPath);

      // Clean up temp file
      cleanupTempFile(localPath);

      if (!muxResult) {
        failed.push(post.id);
        continue;
      }

      // Cache the result
      migratedCfIds.set(videoId, muxResult);
    } else {
      console.log(`  Using cached Mux result for ${videoId}`);
    }

    // Update database
    const newImageUrl = `https://stream.mux.com/${muxResult.playbackId}.m3u8`;
    const newThumbnailUrl = `https://image.mux.com/${muxResult.playbackId}/thumbnail.jpg`;

    const { error: updateError } = await supabase
      .from("posts")
      .update({
        image_url: newImageUrl,
        storage_path: muxResult.playbackId,
        thumbnail_url: newThumbnailUrl,
      })
      .eq("id", post.id);

    if (updateError) {
      console.error(`  Failed to update post:`, updateError);
      failed.push(post.id);
    } else {
      console.log(`  ✓ Successfully migrated post ${post.id}`);
      migrated.push(post.id);
    }
  }

  // Migrate post_images
  for (const image of (postImages || []) as PostImage[]) {
    console.log(`\nMigrating post_image ${image.id}...`);

    // Skip if already migrated to Mux
    if (image.image_url.includes("stream.mux.com")) {
      console.log("  Already migrated to Mux, skipping");
      skipped.push(`image:${image.id}`);
      continue;
    }

    const videoId = extractCloudflareVideoId(image.storage_path || image.image_url);
    if (!videoId) {
      console.log(`  Could not extract Cloudflare video ID, skipping`);
      failed.push(`image:${image.id}`);
      continue;
    }

    console.log(`  Cloudflare video ID: ${videoId}`);

    let muxResult = migratedCfIds.get(videoId);

    if (!muxResult) {
      // Download from Cloudflare
      const localPath = await downloadFromCloudflare(videoId);
      if (!localPath) {
        failed.push(`image:${image.id}`);
        continue;
      }

      // Upload to Mux
      muxResult = await uploadToMux(localPath);

      // Clean up temp file
      cleanupTempFile(localPath);

      if (!muxResult) {
        failed.push(`image:${image.id}`);
        continue;
      }

      // Cache the result
      migratedCfIds.set(videoId, muxResult);
    } else {
      console.log(`  Using cached Mux result for ${videoId}`);
    }

    // Update database
    const newImageUrl = `https://stream.mux.com/${muxResult.playbackId}.m3u8`;
    const newThumbnailUrl = `https://image.mux.com/${muxResult.playbackId}/thumbnail.jpg`;

    const { error: updateError } = await supabase
      .from("post_images")
      .update({
        image_url: newImageUrl,
        storage_path: muxResult.playbackId,
        thumbnail_url: newThumbnailUrl,
      })
      .eq("id", image.id);

    if (updateError) {
      console.error(`  Failed to update post_image:`, updateError);
      failed.push(`image:${image.id}`);
    } else {
      console.log(`  ✓ Successfully migrated post_image ${image.id}`);
      migrated.push(`image:${image.id}`);
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`Migrated: ${migrated.length}`);
  console.log(`Skipped (already on Mux): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed IDs:");
    failed.forEach((id) => console.log(`  - ${id}`));
  }

  // Clean up temp directory
  try {
    fs.rmdirSync(TEMP_DIR);
  } catch {
    // Ignore if not empty
  }
}

// Run migration
migrateVideos().catch(console.error);
