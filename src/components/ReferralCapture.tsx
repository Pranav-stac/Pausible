"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const REF_KEY = "pausible_ref_code";

export function ReferralCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = params.get("ref");
    if (ref && ref.trim()) {
      window.localStorage.setItem(REF_KEY, ref.trim().toUpperCase());
    }
  }, [params]);

  return null;
}

export function readStoredReferral(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REF_KEY);
}
