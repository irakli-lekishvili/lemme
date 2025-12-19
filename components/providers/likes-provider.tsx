"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type LikesContextType = {
  likedIds: Set<string>;
  likeCounts: Map<string, number>;
  isLoading: boolean;
  toggleLike: (postId: string) => Promise<void>;
  isLiked: (postId: string) => boolean;
  getLikeCount: (postId: string, initialCount: number) => number;
};

const LikesContext = createContext<LikesContextType | null>(null);

export function LikesProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function fetchLikes() {
      const supabase = createClient();
      const { data } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId);

      if (data) {
        setLikedIds(new Set(data.map((l) => l.post_id)));
      }
      setIsLoading(false);
    }

    fetchLikes();
  }, [userId]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;

      const supabase = createClient();
      const isCurrentlyLiked = likedIds.has(postId);

      // Optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });

      setLikeCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(postId) ?? 0;
        next.set(postId, isCurrentlyLiked ? current - 1 : current + 1);
        return next;
      });

      if (isCurrentlyLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("likes")
          .insert({ user_id: userId, post_id: postId });
      }
    },
    [userId, likedIds]
  );

  const isLiked = useCallback(
    (postId: string) => likedIds.has(postId),
    [likedIds]
  );

  const getLikeCount = useCallback(
    (postId: string, initialCount: number) => {
      if (likeCounts.has(postId)) {
        return likeCounts.get(postId)!;
      }
      return initialCount;
    },
    [likeCounts]
  );

  return (
    <LikesContext.Provider
      value={{ likedIds, likeCounts, isLoading, toggleLike, isLiked, getLikeCount }}
    >
      {children}
    </LikesContext.Provider>
  );
}

export function useLikes() {
  const context = useContext(LikesContext);
  if (!context) {
    throw new Error("useLikes must be used within a LikesProvider");
  }
  return context;
}
