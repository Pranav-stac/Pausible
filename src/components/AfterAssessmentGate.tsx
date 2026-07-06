"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  APP_BODY,
  APP_HEADING_MD,
  APP_LINK_BACK,
  APP_PAGE_BG_SOFT,
  CTA_PRIMARY_CLASS,
  FORM_CARD_CLASS,
} from "@/components/marketing/marketing-brand";
import { tryClaimAttemptForSession } from "@/lib/data/attempt-claim-client";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, finalizeAttemptPayment } from "@/lib/data/attempt-service";
import { publishShareSnapshot } from "@/lib/data/share-service";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { randomShareToken } from "@/lib/share-token";
import { appendTestAutoPdfToHref, isTestAutoPdfRequested } from "@/lib/testing/test-results-query";

type NextStep = "results" | "checkout";

export function AfterAssessmentGate({ attemptId }: { attemptId: string }) {
  const params = useSearchParams();
  const next = (params.get("next") === "checkout" ? "checkout" : "results") as NextStep;
  const { ready, hasGoogleIdentity, linkOrSignInWithGoogle } = useFirebaseAuth();
  const { requirePayment, loading: settingsLoading } = useAppSettings();
  const resolvedNext: NextStep = requirePayment ? "checkout" : next;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const testAutoPdf = isTestAutoPdfRequested(params);

  const destPath = useMemo(() => {
    const base =
      resolvedNext === "checkout"
        ? `/checkout?attemptId=${encodeURIComponent(attemptId)}`
        : `/results/${encodeURIComponent(attemptId)}`;
    return testAutoPdf ? appendTestAutoPdfToHref(base) : base;
  }, [attemptId, resolvedNext, testAutoPdf]);

  const continueAfterGoogle = useCallback(async () => {
    const claimed = await tryClaimAttemptForSession(attemptId);
    const uid = getFirebaseAuth()?.currentUser?.uid;

    if (resolvedNext === "results") {
      const attempt = await fetchAttempt(attemptId);
      if (!attempt || (uid && attempt.uid !== uid && !claimed)) {
        throw new Error("We could not attach this assessment to your Google account. Please use the same browser you submitted from.");
      }
      if (attempt.paymentStatus !== "paid") {
        const assessment = await fetchAssessment(attempt.assessmentId);
        if (!assessment) throw new Error("Assessment not found or inactive.");
        const token = randomShareToken();
        await finalizeAttemptPayment({
          uid: attempt.uid,
          attemptId,
          shareToken: token,
          paymentProvider: "free",
          paymentId: "free-mode",
        });
        const paid = await fetchAttempt(attemptId);
        if (paid) await publishShareSnapshot(assessment, paid, token);
      }
    }

    if (typeof window !== "undefined") {
      window.location.assign(destPath);
    }
  }, [attemptId, destPath, resolvedNext]);

  useEffect(() => {
    if (!ready || settingsLoading || !isFirebaseConfigured() || !hasGoogleIdentity) return;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        await continueAfterGoogle();
        try {
          sessionStorage.removeItem("pausable_google_redirect_pending");
        } catch {
          /* ignore */
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Could not finish sign-in.");
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, settingsLoading, hasGoogleIdentity, continueAfterGoogle]);

  const onConnectGoogle = useCallback(async () => {
    setErr(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setErr("Firebase is not available in this browser.");
      return;
    }
    setBusy(true);
    try {
      const outcome = await linkOrSignInWithGoogle();
      if (outcome === "redirect") {
        try {
          sessionStorage.setItem("pausable_google_redirect_pending", "1");
        } catch {
          /* private mode */
        }
        return;
      }
      if (outcome === "completed") {
        try {
          sessionStorage.removeItem("pausable_google_redirect_pending");
        } catch {
          /* ignore */
        }
        await continueAfterGoogle();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }, [continueAfterGoogle, linkOrSignInWithGoogle]);

  const returningFromGoogleRedirect =
    typeof window !== "undefined" &&
    (() => {
      try {
        return sessionStorage.getItem("pausable_google_redirect_pending") === "1";
      } catch {
        return false;
      }
    })();

  if (!ready || settingsLoading || (returningFromGoogleRedirect && !hasGoogleIdentity && !err)) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${APP_PAGE_BG_SOFT} px-4 ${APP_BODY}`}>
        {returningFromGoogleRedirect ? "Completing Google sign-in…" : "Preparing…"}
      </div>
    );
  }

  if (!isFirebaseConfigured()) {
    if (typeof window !== "undefined") window.location.assign(destPath);
    return null;
  }

  if (hasGoogleIdentity && !err) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${APP_PAGE_BG_SOFT} px-4 ${APP_BODY}`}>
        Redirecting…
      </div>
    );
  }

  return (
    <div className={`${APP_PAGE_BG_SOFT} px-4 py-12`}>
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausibl home">
            <BrandLogo sizeClass="text-lg" />
          </Link>
        </div>

        <div className={`${FORM_CARD_CLASS} p-8`}>
          <h1 className={`text-center ${APP_HEADING_MD}`}>Sign in to see your results</h1>
          <p className={`mt-3 text-center ${APP_BODY}`}>
            Your assessment is saved. Sign in with Google to attach it to your account and open{" "}
            {resolvedNext === "checkout" ? "checkout" : "your results"} — results are not available without Google
            sign-in.
          </p>

          {err ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800">
              {err}
            </p>
          ) : null}

          <div className="mt-8">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onConnectGoogle()}
              className={`w-full ${CTA_PRIMARY_CLASS} disabled:opacity-50`}
            >
              {busy ? "Working…" : "Sign in with Google"}
            </button>
          </div>

          <p className={`mt-6 text-center text-[11px] leading-relaxed ${APP_BODY} !text-[#6E7191]`}>
            Use the same browser you used for the assessment so we can match your answers if you sign in with an
            existing Google account.
          </p>

          <Link href="/" className={`mt-6 block text-center font-semibold ${APP_LINK_BACK}`}>
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
