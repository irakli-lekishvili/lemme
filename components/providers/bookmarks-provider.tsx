"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type BookmarksContextType = {
  bookmarkedIds: Set<string>;
  isLoading: boolean;
  isAuthenticated: boolean;
  toggleBookmark: (postId: string) => Promise<void>;
  isBookmarked: (postId: string) => boolean;
};

const BookmarksContext = createContext<BookmarksContextType | null>(null);

export function BookmarksProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function fetchBookmarks() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", userId);

      if (data) {
        setBookmarkedIds(new Set(data.map((b) => b.post_id)));
      }
      setIsLoading(false);
    }

    fetchBookmarks();
  }, [userId]);

  const toggleBookmark = useCallback(
    async (postId: string) => {
      if (!userId) return;

      const supabase = createClient();
      const isCurrentlyBookmarked = bookmarkedIds.has(postId);

      // Optimistic update
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyBookmarked) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });

      if (isCurrentlyBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
      } else {
        await supabase
          .from("bookmarks")
          .insert({ user_id: userId, post_id: postId });
      }
    },
    [userId, bookmarkedIds]
  );

  const isBookmarked = useCallback(
    (postId: string) => bookmarkedIds.has(postId),
    [bookmarkedIds]
  );

  return (
    <BookmarksContext.Provider
      value={{ bookmarkedIds, isLoading, isAuthenticated: !!userId, toggleBookmark, isBookmarked }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return context;
}
