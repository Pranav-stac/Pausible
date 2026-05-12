"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { tryClaimAttemptForSession } from "@/lib/data/attempt-claim-client";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, finalizeAttemptPayment } from "@/lib/data/attempt-service";
import { publishShareSnapshot } from "@/lib/data/share-service";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { randomShareToken } from "@/lib/share-token";

type NextStep = "results" | "checkout";

export function AfterAssessmentGate({ attemptId }: { attemptId: string }) {
  const params = useSearchParams();
  const next = (params.get("next") === "checkout" ? "checkout" : "results") as NextStep;
  const { ready, hasGoogleIdentity, signInWithGoogle } = useFirebaseAuth();
  const { requirePayment, loading: settingsLoading } = useAppSettings();
  const resolvedNext: NextStep = requirePayment ? "checkout" : next;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submittedAsGuest, setSubmittedAsGuest] = useState(false);

  const destPath = useMemo(
    () =>
      resolvedNext === "checkout"
        ? `/checkout?attemptId=${encodeURIComponent(attemptId)}`
        : `/results/${encodeURIComponent(attemptId)}`,
    [attemptId, resolvedNext],
  );

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
    if (!ready || settingsLoading || !isFirebaseConfigured() || !hasGoogleIdentity || submittedAsGuest) return;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        await continueAfterGoogle();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Could not finish sign-in.");
      } finally {
        setBusy(false);
      }
    })();
  }, [ready, settingsLoading, hasGoogleIdentity, submittedAsGuest, continueAfterGoogle]);

  const onConnectGoogle = useCallback(async () => {
    setErr(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setErr("Firebase is not available in this browser.");
      return;
    }
    setBusy(true);
    try {
      const outcome = await signInWithGoogle();
      if (outcome === "completed") {
        await continueAfterGoogle();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }, [continueAfterGoogle, signInWithGoogle]);

  const onContinueGuest = useCallback(() => {
    setSubmittedAsGuest(true);
  }, []);

  if (!ready || settingsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">
        Preparing…
      </div>
    );
  }

  if (!isFirebaseConfigured()) {
    if (typeof window !== "undefined") window.location.assign(destPath);
    return null;
  }

  if (hasGoogleIdentity && !err) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">
        Redirecting…
      </div>
    );
  }

  if (submittedAsGuest) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-sky-50/40 px-4 py-12">
        <div className="mx-auto max-w-md">
          <div className="mb-8 flex justify-center">
            <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
              <BrandLogo heightClass="h-8" withWordmark wordmarkClassName="text-lg" />
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-[0_24px_60px_-28px_rgba(15,23,42,0.2)]">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Assessment submitted</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Your responses were saved as an anonymous submission for admin review. Results are only unlocked after
              Google sign-in.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmittedAsGuest(false);
                  void onConnectGoogle();
                }}
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
              >
                Sign in to unlock results
              </button>
              <Link
                href="/"
                className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-sky-50/40 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-8" withWordmark wordmarkClassName="text-lg" />
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.2)]">
          <h1 className="text-center text-xl font-semibold tracking-tight text-slate-900">Save your assessment</h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-600">
            Sign in with Google to attach this run to your account and open {resolvedNext === "checkout" ? "checkout" : "your results"}.
            If you skip, admins will still see the response as anonymous, but results will stay locked.
          </p>

          {err ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800">
              {err}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onConnectGoogle()}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
            >
              {busy ? "Working…" : "Continue with Google"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onContinueGuest}
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              Submit anonymously
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
            Use the same browser you used for the assessment so we can match your answers if you sign in with an
            existing Google account.
          </p>

          <Link href="/" className="mt-6 block text-center text-sm font-semibold text-sky-700 hover:text-indigo-800">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
