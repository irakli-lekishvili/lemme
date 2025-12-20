/**
 * Cloudflare Images integration
 *
 * Provides upload and delivery URL generation for optimized images.
 *
 * Setup required:
 * 1. Get your Account ID from Cloudflare Dashboard > Images
 * 2. Create an API token with Images:Edit permission
 * 3. Get your Account Hash from the delivery URL shown in dashboard
 */

// Image variants for different use cases
export type ImageVariant =
  | "thumbnail"  // 400px - related posts grid
  | "medium"     // 600px - masonry grid, timeline feed
  | "large"      // 1200px - post detail page
  | "xlarge";    // 2400px - expanded modal (retina)

type CloudflareUploadResponse = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
  };
};

/**
 * Upload an image to Cloudflare Images
 */
export async function uploadToCloudflare(file: File): Promise<{ id: string; variants: string[] }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Images credentials not configured");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    }
  );

  const data: CloudflareUploadResponse = await response.json();

  if (!data.success || !data.result) {
    const errorMessage = data.errors?.[0]?.message || "Upload failed";
    throw new Error(errorMessage);
  }

  return {
    id: data.result.id,
    variants: data.result.variants,
  };
}

/**
 * Delete an image from Cloudflare Images
 */
export async function deleteFromCloudflare(imageId: string): Promise<boolean> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_IMAGES_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare Images credentials not configured");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1/${imageId}`,
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
 * Get the Cloudflare delivery URL for an image
 *
 * @param imageId - The Cloudflare image ID (or full URL to extract from)
 * @param variant - The size variant to use
 * @returns The optimized delivery URL
 */
export function getCloudflareImageUrl(imageId: string, variant: ImageVariant = "large"): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;

  if (!accountHash) {
    throw new Error("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH not configured");
  }

  // If it's already a Cloudflare URL, extract the ID
  const cfMatch = imageId.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  if (cfMatch) {
    return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
  }

  // Assume it's a raw Cloudflare image ID
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

/**
 * Check if a URL is a Cloudflare Images URL
 */
export function isCloudflareUrl(url: string): boolean {
  return url.includes("imagedelivery.net");
}

/**
 * Extract Cloudflare image ID from URL
 */
export function extractCloudflareId(url: string): string | null {
  const match = url.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}
