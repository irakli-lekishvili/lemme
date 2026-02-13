"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Heart,
  Calendar,
  Film,
  ImageIcon,
  Trash2,
  X,
  Check,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeletePostButton } from "@/components/admin/delete-post-button";
import { deletePosts } from "@/app/admin/actions";

interface Post {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  image_url: string;
  short_id: string | null;
  media_type: string | null;
  likes_count: number | null;
  created_at: string;
  deleted_at: string | null;
}

interface PostsListProps {
  posts: Post[];
  view: "grid" | "list";
}

export function PostsList({ posts, view }: PostsListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const deletablePosts = posts.filter((p) => !p.deleted_at);
  const allDeletableSelected =
    deletablePosts.length > 0 &&
    deletablePosts.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allDeletableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(deletablePosts.map((p) => p.id)));
    }
  }

  function handleBulkDelete() {
    const ids = Array.from(selected);
    if (
      !confirm(`Are you sure you want to delete ${ids.length} post(s)?`)
    )
      return;

    startTransition(async () => {
      await deletePosts(ids);
      setSelected(new Set());
    });
  }

  return (
    <div>
      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-bg-elevated border border-border-subtle rounded-xl">
          <button
            onClick={() => setSelected(new Set())}
            className="p-1 rounded-md hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-text-primary">
            {selected.size} selected
          </span>
          <div className="h-4 w-px bg-border-subtle" />
          <button
            onClick={toggleAll}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            {allDeletableSelected ? "Deselect all" : "Select all"}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-error-500/10 text-error-400 hover:bg-error-500/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isPending ? "Deleting..." : "Delete selected"}
          </button>
        </div>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => {
            const isSelected = selected.has(post.id);
            return (
              <div
                key={post.id}
                className={`group bg-bg-card border rounded-xl overflow-hidden transition-colors ${
                  post.deleted_at
                    ? "border-error-500/30 opacity-60"
                    : isSelected
                      ? "border-primary-500 ring-1 ring-primary-500/30"
                      : "border-border-subtle hover:border-border-strong"
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square relative bg-bg-surface cursor-pointer"
                  onClick={() => !post.deleted_at && toggle(post.id)}
                >
                  {post.thumbnail_url || post.image_url ? (
                    <Image
                      src={post.thumbnail_url || post.image_url}
                      alt={post.title || "Post"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-text-disabled" />
                    </div>
                  )}

                  {/* Checkbox overlay */}
                  {!post.deleted_at && (
                    <div
                      className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-primary-500 border-primary-500"
                          : "border-white/60 bg-black/30 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  )}

                  {/* Media type badge */}
                  {post.media_type === "video" && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 flex items-center gap-1">
                      <Film className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">
                        Video
                      </span>
                    </div>
                  )}
                  {post.deleted_at && (
                    <div className="absolute top-2 right-2 bg-error-500/80 backdrop-blur-sm rounded-md px-2 py-0.5">
                      <span className="text-xs text-white font-medium">
                        Deleted
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {post.title || "Untitled"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/post/${post.short_id || post.id}`}
                        target="_blank"
                        className="p-1.5 rounded-md hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      {!post.deleted_at && <DeletePostButton postId={post.id} />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="w-10">
                  <button
                    onClick={toggleAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      allDeletableSelected
                        ? "bg-primary-500 border-primary-500"
                        : "border-text-disabled hover:border-text-muted"
                    }`}
                  >
                    {allDeletableSelected && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Likes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const isSelected = selected.has(post.id);
                return (
                  <TableRow
                    key={post.id}
                    className={`${post.deleted_at ? "opacity-60" : ""} ${isSelected ? "bg-primary-500/5" : ""}`}
                  >
                    <TableCell>
                      {!post.deleted_at ? (
                        <button
                          onClick={() => toggle(post.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary-500 border-primary-500"
                              : "border-text-disabled hover:border-text-muted"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5 h-5" />
                      )}
                    </TableCell>
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
                        <div className="w-12 h-12 rounded-lg bg-bg-surface flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-text-disabled" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium">
                          {post.title || "Untitled"}
                        </span>
                        {post.deleted_at && (
                          <span className="badge bg-error-500/10 text-error-400">
                            Deleted
                          </span>
                        )}
                      </div>
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
                        {!post.deleted_at && (
                          <DeletePostButton postId={post.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
