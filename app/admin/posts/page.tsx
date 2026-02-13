import { createServiceClient } from "@/lib/supabase/service";
import { PostsToolbar } from "@/components/admin/posts-toolbar";
import { PostsList } from "@/components/admin/posts-list";
import { ImageIcon } from "lucide-react";

const PAGE_SIZE = 12;

interface PageProps {
  searchParams: Promise<{ page?: string; view?: string }>;
}

export default async function AdminPostsPage({ searchParams }: PageProps) {
  const { page: pageParam, view: viewParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const view = viewParam === "list" ? "list" : "grid";

  const service = createServiceClient();

  const { count } = await service
    .from("posts")
    .select("*", { count: "exact", head: true });

  const totalPosts = count ?? 0;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: posts, error } = await service
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return (
      <div className="text-error-400">
        Failed to load posts: {error.message}
      </div>
    );
  }

  // Fetch image counts for grouped posts
  const postIds = posts.map((p) => p.id);
  const { data: imageRows } = await service
    .from("post_images")
    .select("post_id")
    .in("post_id", postIds);

  const imageCounts: Record<string, number> = {};
  if (imageRows) {
    for (const row of imageRows) {
      imageCounts[row.post_id] = (imageCounts[row.post_id] || 0) + 1;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Posts</h2>
          <p className="text-sm text-text-muted mt-1">
            {totalPosts} total &middot; Page {page} of{" "}
            {Math.max(1, Math.ceil(totalPosts / PAGE_SIZE))}
          </p>
        </div>
        <PostsToolbar totalPosts={totalPosts} pageSize={PAGE_SIZE} />
      </div>

      {posts.length === 0 ? (
        <div className="bg-bg-card border border-border-subtle rounded-xl p-12 text-center">
          <ImageIcon className="w-10 h-10 text-text-disabled mx-auto mb-3" />
          <p className="text-text-muted">No posts found</p>
        </div>
      ) : (
        <PostsList posts={posts} view={view} imageCounts={imageCounts} />
      )}

      {/* Bottom pagination */}
      {Math.ceil(totalPosts / PAGE_SIZE) > 1 && (
        <div className="flex justify-center mt-6">
          <PostsToolbar totalPosts={totalPosts} pageSize={PAGE_SIZE} />
        </div>
      )}
    </div>
  );
}
