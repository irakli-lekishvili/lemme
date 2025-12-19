"use client";

import { REPORT_REASONS, ReportReason, useReports } from "@/components/providers/reports-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Flag } from "lucide-react";
import { useEffect, useState } from "react";

interface ReportModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

function ReportContent({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const { submitReport, hasReported } = useReports();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const alreadyReported = hasReported(postId);

  const handleSubmit = async () => {
    if (!selectedReason || isSubmitting) return;

    setIsSubmitting(true);
    const success = await submitReport(postId, selectedReason, description);
    setIsSubmitting(false);

    if (success) {
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setSelectedReason(null);
        setDescription("");
      }, 1500);
    }
  };

  if (alreadyReported) {
    return (
      <div className="text-center py-8">
        <Flag className="w-12 h-12 text-text-secondary mx-auto mb-3" />
        <p className="text-text-primary font-medium">Already Reported</p>
        <p className="text-text-secondary text-sm mt-1">
          You have already reported this content.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <Flag className="w-6 h-6 text-green-500" />
        </div>
        <p className="text-text-primary font-medium">Report Submitted</p>
        <p className="text-text-secondary text-sm mt-1">
          Thank you for helping keep our community safe.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-text-secondary text-sm mb-3">
        Why are you reporting this content?
      </p>
      <div className="space-y-2 mb-4">
        {REPORT_REASONS.map((reason) => (
          <button
            key={reason.id}
            type="button"
            onClick={() => setSelectedReason(reason.id)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              selectedReason === reason.id
                ? "border-primary-500 bg-primary-500/10 text-text-primary"
                : "border-border-primary hover:border-border-secondary text-text-secondary hover:text-text-primary"
            }`}
          >
            {reason.label}
          </button>
        ))}
      </div>

      {selectedReason && (
        <div className="mb-4">
          <label htmlFor="report-description" className="block text-sm text-text-secondary mb-2">
            Additional details (optional)
          </label>
          <textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more context..."
            className="w-full px-4 py-3 bg-bg-hover border border-border-primary rounded-lg text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:border-primary-500"
            rows={3}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedReason || isSubmitting}
        className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Submit Report"}
      </button>
    </>
  );
}

export function ReportModal({ postId, isOpen, onClose }: ReportModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-bg-base border-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <Flag className="w-5 h-5 text-red-500" />
              Report Content
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              Help us understand what&apos;s wrong with this content.
            </DialogDescription>
          </DialogHeader>
          <ReportContent postId={postId} onClose={onClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-bg-base border-none max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-center gap-2 text-text-primary">
            <Flag className="w-5 h-5 text-red-500" />
            Report Content
          </DrawerTitle>
          <DrawerDescription className="text-text-secondary">
            Help us understand what&apos;s wrong with this content.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 overflow-y-auto">
          <ReportContent postId={postId} onClose={onClose} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
