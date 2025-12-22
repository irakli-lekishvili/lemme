"use client";

import { Play } from "lucide-react";
import Link from "next/link";

type ImageVariant = "thumbnail" | "medium" | "large" | "xlarge";

// Get optimized image URL with Cloudflare Images variants
function getImageUrl(src: string, id: string, variant: ImageVariant = "large"): string {
  if (src.includes("picsum")) {
    return `${src}?random=${id}`;
  }

  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  if (!accountHash) return src;

  // Extract Cloudflare image ID and build delivery URL with variant
  const cfMatch = src.match(/imagedelivery\.net\/[^/]+\/([^/]+)/);
  if (cfMatch) {
    return `https://imagedelivery.net/${accountHash}/${cfMatch[1]}/${variant}`;
  }

  return src;
}

type RelatedPost = {
  id: string;
  image_url: string;
  short_id: string | null;
  title: string | null;
  media_type?: "image" | "video" | "gif" | null;
  thumbnail_url?: string | null;
};

interface RelatedPostsProps {
  posts: RelatedPost[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  const getDisplayUrl = (post: RelatedPost) => {
    if (post.media_type === "video" && post.thumbnail_url) {
      return post.thumbnail_url;
    }
    return getImageUrl(post.image_url, post.id, "thumbnail");
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/post/${post.short_id || post.id}`}
          className="group relative aspect-square bg-bg-elevated rounded-lg overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getDisplayUrl(post)}
            alt={post.title || "Related post"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {post.media_type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
