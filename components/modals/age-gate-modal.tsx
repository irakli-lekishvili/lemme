"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AgeGateModalProps = {
  onConfirm: () => void;
};

export function AgeGateModal({ onConfirm }: AgeGateModalProps) {
  const handleExit = () => {
    window.location.href = "https://google.com";
  };

  return (
    <DialogPrimitive.Root open={true}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg p-6 shadow-lg duration-200 outline-none sm:max-w-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl">Age Verification</DialogTitle>
          <DialogDescription className="text-base pt-2">
            This website contains adult content and is intended for individuals
            who are 18 years of age or older.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 text-center text-sm text-muted-foreground">
          By entering, you confirm that you are at least 18 years old and agree
          to our terms of service.
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <button
            onClick={onConfirm}
            className="btn btn-primary w-full py-3 text-base font-medium"
          >
            I am 18 or older - Enter
          </button>
          <button
            onClick={handleExit}
            className="btn btn-outline w-full py-3 text-base"
          >
            I am under 18 - Exit
          </button>
        </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
