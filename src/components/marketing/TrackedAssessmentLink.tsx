"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AssessmentLoginPromptDialog } from "@/components/marketing/AssessmentLoginPromptDialog";
import { setPendingAssessmentHref } from "@/components/marketing/ResumePendingAssessmentNavigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { trackCtaAssessment } from "@/lib/analytics/track";

export function TrackedAssessmentLink({
  href,
  placement,
  className,
  children,
  onAfterTrack,
  promptLogin = true,
}: {
  href: string;
  placement: string;
  className?: string;
  children: ReactNode;
  /** e.g. close mobile menu after tapping a tracked marketing CTA */
  onAfterTrack?: () => void;
  /** Show optional Google sign-in dialog when the visitor is not signed in (landing CTAs). */
  promptLogin?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { ready, effectiveUid, user, hasGoogleIdentity, linkGoogle, signInWithGoogle } = useFirebaseAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSignedIn = Boolean(user?.email) || hasGoogleIdentity;
  const shouldPromptLogin =
    promptLogin && ready && isFirebaseConfigured() && !isSignedIn;

  const goToAssessment = useCallback(() => {
    setDialogOpen(false);
    setErr(null);
    router.push(href);
  }, [href, router]);

  const onSignIn = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const outcome = user?.isAnonymous ? await linkGoogle() : await signInWithGoogle();
      if (outcome === "redirect") {
        setPendingAssessmentHref(href);
        return;
      }
      if (outcome === "completed") goToAssessment();
      if (outcome === "cancelled") setErr("Sign-in was cancelled.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }, [goToAssessment, linkGoogle, signInWithGoogle, user?.isAnonymous]);

  return (
    <>
      <Link
        href={href}
        className={className}
        onClick={(e) => {
          void trackCtaAssessment(placement, pathname, effectiveUid);
          onAfterTrack?.();
          if (shouldPromptLogin) {
            e.preventDefault();
            setErr(null);
            setDialogOpen(true);
          }
        }}
      >
        {children}
      </Link>

      <AssessmentLoginPromptDialog
        open={dialogOpen}
        busy={busy}
        error={err}
        onClose={() => {
          if (!busy) setDialogOpen(false);
        }}
        onSignIn={() => void onSignIn()}
      />
    </>
  );
}
