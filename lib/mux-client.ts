/**
 * Client-safe Mux utilities (no server dependencies).
 */

/**
 * Extract Mux playback ID from a stream URL.
 * URL format: https://stream.mux.com/{playbackId}.m3u8
 * Returns null for non-Mux URLs (e.g. Cloudflare Stream).
 */
export function extractMuxPlaybackId(url: string): string | null {
  const match = url.match(/stream\.mux\.com\/([^/.]+)/);
  return match ? match[1] : null;
}
