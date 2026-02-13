import { createServiceClient } from "@/lib/supabase/service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function AdminPostsPage() {
  const service = createServiceClient();

  const { data: posts, error } = await service
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-error-400">Failed to load posts: {error.message}</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">Posts</h2>
        <p className="text-sm text-text-muted">{posts.length} total</p>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border-subtle hover:bg-transparent">
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Likes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  {post.thumbnail_url || post.image_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-bg-surface relative">
                      <Image
                        src={post.thumbnail_url || post.image_url}
                        alt={post.title || "Post"}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-bg-surface" />
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-text-primary font-medium">
                    {post.title || "Untitled"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="badge badge-secondary">
                    {post.media_type || "image"}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-text-secondary">
                  {post.likes_count ?? 0}
                </TableCell>
                <TableCell className="text-sm text-text-muted">
                  {new Date(post.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/post/${post.short_id || post.id}`}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <DeletePostButton postId={post.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {posts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-text-muted py-12"
                >
                  No posts found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
