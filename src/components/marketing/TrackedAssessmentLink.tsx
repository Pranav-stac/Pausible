"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { trackCtaAssessment } from "@/lib/analytics/track";

export function TrackedAssessmentLink({
  href,
  placement,
  className,
  children,
  onAfterTrack,
}: {
  href: string;
  placement: string;
  className?: string;
  children: ReactNode;
  /** e.g. close mobile menu after tapping a tracked marketing CTA */
  onAfterTrack?: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const { effectiveUid } = useFirebaseAuth();
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void trackCtaAssessment(placement, pathname, effectiveUid);
        onAfterTrack?.();
      }}
    >
      {children}
    </Link>
  );
}
