"use client";

import { BookmarksProvider } from "./bookmarks-provider";
import { LikesProvider } from "./likes-provider";
import { ReportsProvider } from "./reports-provider";

export function Providers({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  return (
    <BookmarksProvider userId={userId}>
      <LikesProvider userId={userId}>
        <ReportsProvider userId={userId}>{children}</ReportsProvider>
      </LikesProvider>
    </BookmarksProvider>
  );
}
