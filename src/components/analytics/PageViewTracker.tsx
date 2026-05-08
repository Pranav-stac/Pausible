"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { trackPageView } from "@/lib/analytics/track";

/**
 * Logs SPA route changes as page views (Firebase Analytics + Firestore `site_events`).
 */
export function PageViewTracker() {
  const pathname = usePathname() ?? "/";
  const { effectiveUid, ready } = useFirebaseAuth();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !effectiveUid) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void trackPageView(pathname, effectiveUid);
  }, [effectiveUid, pathname, ready]);

  return null;
}
