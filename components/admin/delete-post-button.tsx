"use client";

import { deletePost } from "@/app/admin/actions";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;

    startTransition(async () => {
      await deletePost(postId);
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 rounded-lg hover:bg-error-500/10 transition-colors text-text-muted hover:text-error-400 disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
