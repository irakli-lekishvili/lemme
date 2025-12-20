"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AgeGateModal } from "@/components/modals/age-gate-modal";

const AGE_GATE_STORAGE_KEY = "age_verified";

type AgeGateContextType = {
  isVerified: boolean;
  isLoading: boolean;
  verify: () => void;
};

const AgeGateContext = createContext<AgeGateContextType | null>(null);

export function AgeGateProvider({ children }: { children: React.ReactNode }) {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(AGE_GATE_STORAGE_KEY);
    if (stored === "true") {
      setIsVerified(true);
    }
    setIsLoading(false);
  }, []);

  const verify = useCallback(() => {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
    setIsVerified(true);
  }, []);

  return (
    <AgeGateContext.Provider value={{ isVerified, isLoading, verify }}>
      {children}
      {!isLoading && !isVerified && <AgeGateModal onConfirm={verify} />}
    </AgeGateContext.Provider>
  );
}

export function useAgeGate() {
  const context = useContext(AgeGateContext);
  if (!context) {
    throw new Error("useAgeGate must be used within an AgeGateProvider");
  }
  return context;
}
