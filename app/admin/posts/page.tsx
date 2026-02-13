import { createServiceClient } from "@/lib/supabase/service";
import { PostsToolbar } from "@/components/admin/posts-toolbar";
import { PostsList, type PostItem } from "@/components/admin/posts-list";
import { ImageIcon } from "lucide-react";

const PAGE_SIZE = 24;

interface PageProps {
  searchParams: Promise<{ page?: string; view?: string }>;
}

export default async function AdminPostsPage({ searchParams }: PageProps) {
  const { page: pageParam, view: viewParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const view = viewParam === "list" ? "list" : "grid";

  const service = createServiceClient();

  // Count total individual files (post_images rows)
  const { count: totalFiles } = await service
    .from("post_images")
    .select("*", { count: "exact", head: true });

  const totalItems = totalFiles ?? 0;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch individual images with their parent post data
  const { data: images, error } = await service
    .from("post_images")
    .select(
      `
      id,
      image_url,
      thumbnail_url,
      media_type,
      position,
      post_id,
      posts (
        id,
        title,
        short_id,
        media_type,
        likes_count,
        created_at,
        deleted_at
      )
    `
    )
    .order("created_at", { ascending: false, referencedTable: "posts" })
    .order("position", { ascending: true })
    .range(from, to);

  if (error) {
    return (
      <div className="text-error-400">
        Failed to load posts: {error.message}
      </div>
    );
  }

  // Flatten into display items
  const items: PostItem[] = (images ?? []).map((img) => {
    const post = img.posts as unknown as {
      id: string;
      title: string | null;
      short_id: string | null;
      media_type: string | null;
      likes_count: number | null;
      created_at: string;
      deleted_at: string | null;
    };
    return {
      id: img.id,
      postId: post.id,
      title: post.title,
      image_url: img.image_url,
      thumbnail_url: img.thumbnail_url,
      short_id: post.short_id,
      media_type: img.media_type ?? post.media_type,
      likes_count: post.likes_count,
      created_at: post.created_at,
      deleted_at: post.deleted_at,
      position: img.position,
    };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Posts</h2>
          <p className="text-sm text-text-muted mt-1">
            {totalItems} files &middot; Page {page} of{" "}
            {Math.max(1, Math.ceil(totalItems / PAGE_SIZE))}
          </p>
        </div>
        <PostsToolbar totalPosts={totalItems} pageSize={PAGE_SIZE} />
      </div>

      {items.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-xl p-12 text-center">
          <ImageIcon className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-text-muted">No posts found</p>
        </div>
      ) : (
        <PostsList items={items} view={view} />
      )}

      {/* Bottom pagination */}
      {Math.ceil(totalItems / PAGE_SIZE) > 1 && (
        <div className="flex justify-center mt-6">
          <PostsToolbar totalPosts={totalItems} pageSize={PAGE_SIZE} />
        </div>
      )}
    </div>
  );
}
