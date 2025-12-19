"use client";

import { BookmarksProvider } from "./bookmarks-provider";

export function Providers({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  return <BookmarksProvider userId={userId}>{children}</BookmarksProvider>;
}
