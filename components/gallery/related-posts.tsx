"use client";

import Link from "next/link";

// Convert Supabase storage URLs to local proxy
function getImageUrl(src: string, id: string): string {
  if (src.includes("picsum")) {
    return `${src}?random=${id}`;
  }
  const match = src.match(/\/storage\/v1\/object\/public\/images\/(.+)$/);
  if (match) {
    return `/api/images/${match[1]}`;
  }
  return src;
}

type RelatedPost = {
  id: string;
  image_url: string;
  short_id: string | null;
  title: string | null;
};

interface RelatedPostsProps {
  posts: RelatedPost[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
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
            src={getImageUrl(post.image_url, post.id)}
            alt={post.title || "Related post"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        </Link>
      ))}
    </div>
  );
}
