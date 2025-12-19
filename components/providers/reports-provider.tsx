"use client";

import { createClient } from "@/lib/supabase/client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const REPORT_REASONS = [
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "violence", label: "Violence or dangerous content" },
  { id: "copyright", label: "Copyright infringement" },
  { id: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

type ReportsContextType = {
  reportedIds: Set<string>;
  isLoading: boolean;
  isAuthenticated: boolean;
  submitReport: (postId: string, reason: ReportReason, description?: string) => Promise<boolean>;
  hasReported: (postId: string) => boolean;
};

const ReportsContext = createContext<ReportsContextType | null>(null);

export function ReportsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function fetchReports() {
      const supabase = createClient();
      const { data } = await supabase
        .from("reports")
        .select("post_id")
        .eq("user_id", userId);

      if (data) {
        setReportedIds(new Set(data.map((r) => r.post_id)));
      }
      setIsLoading(false);
    }

    fetchReports();
  }, [userId]);

  const submitReport = useCallback(
    async (postId: string, reason: ReportReason, description?: string): Promise<boolean> => {
      if (!userId) return false;
      if (reportedIds.has(postId)) return false;

      const supabase = createClient();

      // Optimistic update
      setReportedIds((prev) => {
        const next = new Set(prev);
        next.add(postId);
        return next;
      });

      const { error } = await supabase
        .from("reports")
        .insert({
          user_id: userId,
          post_id: postId,
          reason,
          description: description || null,
        });

      if (error) {
        // Revert optimistic update on error
        setReportedIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        return false;
      }

      return true;
    },
    [userId, reportedIds]
  );

  const hasReported = useCallback(
    (postId: string) => reportedIds.has(postId),
    [reportedIds]
  );

  return (
    <ReportsContext.Provider
      value={{ reportedIds, isLoading, isAuthenticated: !!userId, submitReport, hasReported }}
    >
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error("useReports must be used within a ReportsProvider");
  }
  return context;
}
