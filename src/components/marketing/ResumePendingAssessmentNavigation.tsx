"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

const STORAGE_KEY = "pausable_assessment_pending_href";

export function setPendingAssessmentHref(href: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, href);
  } catch {
    /* private mode */
  }
}

/** After Google redirect sign-in from the landing login prompt, resume the assessment the user chose. */
export function ResumePendingAssessmentNavigation() {
  const router = useRouter();
  const { ready, hasGoogleIdentity, user } = useFirebaseAuth();

  useEffect(() => {
    if (!ready || (!hasGoogleIdentity && !user?.email)) return;
    try {
      const href = sessionStorage.getItem(STORAGE_KEY);
      if (!href) return;
      sessionStorage.removeItem(STORAGE_KEY);
      router.push(href);
    } catch {
      /* ignore */
    }
  }, [ready, hasGoogleIdentity, user?.email, router]);

  return null;
}
