"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavAuthActions } from "@/components/NavAuthActions";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchAttempt, listMyAttempts, patchAttempt } from "@/lib/data/attempt-service";
import { tryClaimAttemptForSession } from "@/lib/data/attempt-claim-client";
import { fetchAssessment } from "@/lib/data/assessment-service";
import type { AssessmentDefinition } from "@/types/models";
import type { StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { personaAnimal, personaLabel } from "@/lib/results/persona-display";
import { dimensionRowsForAttempt } from "@/lib/results/dimension-rows";
import { PausibleResultsReport } from "@/components/results/PausibleResultsReport";
import { ResultsSummaryOverview } from "@/components/results/ResultsSummaryOverview";
import { buildResultsReportModel } from "@/lib/results/build-results-report";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { personaNeedsRecompute } from "@/lib/scoring/normalize-persona";

function ResultsTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/85 bg-white/95 backdrop-blur-sm scheme-light">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-3 py-2.5 sm:justify-between sm:px-4 sm:py-3">
        <Link
          href="/"
          className="mr-auto shrink-0 rounded-lg text-sm font-semibold text-slate-900 outline-offset-4 hover:text-slate-700 sm:mr-0"
        >
          Home
        </Link>
        {isFirebaseConfigured() ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NavAuthActions />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ResultsClient() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const { effectiveUid, ready, hasGoogleIdentity, user } = useFirebaseAuth();
  const mustUseGoogle = isFirebaseConfigured();
  const { requirePayment, loading: settingsLoading } = useAppSettings();

  const [attempt, setAttempt] = useState<SerializedAttempt | null>(null);
  const [assessment, setAssessment] = useState<AssessmentDefinition | null>(null);
  const [history, setHistory] = useState<SerializedAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);
  const [showFullReport, setShowFullReport] = useState(false);

  useEffect(() => {
    if (!ready || settingsLoading || !attemptId || !effectiveUid) return;
    if (mustUseGoogle && !hasGoogleIdentity) return;

    let cancelled = false;

    (async () => {
      setFetching(true);
      setError(null);
      setAttempt(null);
      setAssessment(null);
      setHistory([]);

      let row = await fetchAttempt(attemptId);
      if (cancelled) return;

      if (!row || row.uid !== effectiveUid) {
        await tryClaimAttemptForSession(attemptId);
        if (cancelled) return;
        row = await fetchAttempt(attemptId);
      }
      if (cancelled) return;

      if (!row || row.uid !== effectiveUid) {
        setError(
          hasGoogleIdentity
            ? "Not found for this Google account. If you finished as a guest then signed in with Google, open this link in the same browser tab where you took the assessment (we attach a one-time claim there). Next time, use Link Google on the guest session instead of Sign in."
            : "Not found",
        );
        setFetching(false);
        return;
      }
      if (requirePayment && row.paymentStatus !== "paid") {
        router.replace(`/checkout?attemptId=${encodeURIComponent(attemptId)}`);
        return;
      }

      if (personaNeedsRecompute(row.scores?.persona) || !row.scores?.dimensions) {
        try {
          const personaConfig = await fetchPersonaScoringConfig();
          const scores = computeAttemptScores(row.answers, personaConfig);
          row = {
            ...row,
            scores,
            personaAnalysis: scores.persona ?? row.personaAnalysis ?? null,
          };
          void patchAttempt(row.id, { scores, personaAnalysis: scores.persona ?? null });
        } catch {
          /* show whatever we have */
        }
      }

      setAttempt(row);

      try {
        const asm = await fetchAssessment(row.assessmentId);
        if (cancelled) return;
        if (!asm) {
          setError(
            `Assessment "${row.assessmentId}" was not found in Firestore or is inactive. Sync it from Admin (e.g. “Sync default from question.json”).`,
          );
          setFetching(false);
          return;
        }
        setAssessment(asm);
        const all = await listMyAttempts(effectiveUid);
        if (cancelled) return;
        setHistory(all);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load assessment from Firestore");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, effectiveUid, hasGoogleIdentity, mustUseGoogle, ready, requirePayment, router, settingsLoading]);

  const dimensionRows = useMemo(
    () => (assessment && attempt ? dimensionRowsForAttempt(assessment, attempt) : []),
    [assessment, attempt],
  );

  const handleActionPlanCached = useCallback((cache: StoredActionPlanCache) => {
    setAttempt((row) => (row ? { ...row, actionPlanCache: cache } : row));
  }, []);

  const posterHostSlug = useMemo(() => {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//i, "").split("/")[0];
    return raw || "pausible.com";
  }, []);

  function archetypeHashtagSlug(label?: string | null) {
    if (!label?.trim()) return "ProfileGlow";
    const fused = label.replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 22);
    return fused || "ProfileGlow";
  }

  const reportModel = useMemo(() => {
    if (!attempt || !assessment) return null;
    const name =
      user?.displayName?.trim() ||
      user?.email?.split("@")[0] ||
      "Your profile";
    return buildResultsReportModel({ attempt, assessment, participantName: name });
  }, [attempt, assessment, user?.displayName, user?.email]);

  const storyPoster = useMemo(() => {
    const personaTitle = attempt?.scores?.persona?.personaTitle;
    const fitScore = attempt?.scores?.persona?.fitScore;
    const primaryKey = attempt?.scores?.archetypeKey;
    const animal = personaAnimal(primaryKey);
    const label = personaLabel(primaryKey);

    const tagline =
      fitScore != null
        ? `${Math.round(fitScore)}% persona fit · wellness intelligence`
        : "Wellness intelligence snapshot";

    return {
      archetypeLabel: personaTitle ?? label,
      personaTitle: personaTitle ?? null,
      fitScore: fitScore ?? null,
      animalEmoji: animal?.emoji ?? null,
      animalImagePath: animal?.imagePath ?? null,
      line: tagline,
      dimensions: dimensionRows.slice(0, 5).map((d) => ({ label: d.label, pct: d.pct })),
      hashtags: ["Pausible", `Paus${archetypeHashtagSlug(label)}`, "WellnessReport"],
      siteSlug: posterHostSlug,
    };
  }, [attempt, dimensionRows, posterHostSlug]);

  const shareUrl = useMemo(() => {
    if (!attempt?.shareToken || !attempt.isLatestShareEligible || attempt.paymentStatus !== "paid") return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/${attempt.shareToken}`;
  }, [attempt]);

  const copyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  if (!ready || settingsLoading) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <div className="p-10 text-center text-sm text-slate-600">Loading results…</div>
      </div>
    );
  }

  if (mustUseGoogle && !hasGoogleIdentity) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="mx-auto max-w-lg px-4 py-12 text-center sm:py-16">
          <h1 className="text-lg font-semibold text-slate-900">Sign in to view results</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Results are only unlocked after Google sign-in. If this assessment was submitted from this browser, we will
            attach it to your Google account before opening the result.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/after-assessment/${encodeURIComponent(attemptId)}?next=results`)}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
            >
              Sign in to unlock results
            </button>
            <Link href="/" className="text-sm font-semibold text-sky-700 hover:text-indigo-800">
              ← Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!effectiveUid) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="p-10 text-center text-sm text-slate-600">Connecting your profile…</div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="p-10 text-center text-sm text-slate-600">Loading results…</div>
      </div>
    );
  }

  if (error || !attempt || !assessment) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-16">
          <p className="text-sm leading-relaxed text-slate-600">{error ?? "Something went wrong."}</p>
          {error === "Not found" && isFirebaseConfigured() ? (
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-500">
              Tip: if you started as a guest, use <strong className="text-slate-700">Link Google</strong> in the top bar
              on this page so your attempt stays on the same profile.
            </p>
          ) : null}
          <Link
            href="/assessment/default"
            className="mt-8 inline-block text-sm font-semibold text-sky-700 underline decoration-sky-300 underline-offset-[3px] hover:text-indigo-800"
          >
            Start assessment
          </Link>
        </div>
      </div>
    );
  }

  if (requirePayment && attempt.paymentStatus !== "paid") {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-xl">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Complete payment to unlock</h1>
              <p className="mt-3 text-sm text-slate-700">
                We&apos;ve saved your responses. Checkout unlocks the full premium breakdown for this attempt.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/checkout?attemptId=${encodeURIComponent(attempt.id)}`)}
                className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
              >
                Go to checkout
              </button>
            </div>

            {isFirebaseConfigured() ? (
              <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
                Optional: use <strong className="text-slate-800">Link Google</strong> in the top bar to keep this attempt
                on your account.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!reportModel) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="p-10 text-center text-sm text-slate-600">Preparing your report…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen scheme-light text-slate-900">
      <ResultsTopBar />
      {showFullReport ? (
        <PausibleResultsReport
          model={reportModel}
          attempt={attempt}
          attemptId={attemptId}
          personaAnalysis={attempt.scores?.persona ?? null}
          onBack={() => setShowFullReport(false)}
          onCopyShare={() => void copyShare()}
          shareUrl={shareUrl}
          onActionPlanCached={handleActionPlanCached}
        />
      ) : (
        <ResultsSummaryOverview
          model={reportModel}
          attemptId={attemptId}
          dimensionRows={dimensionRows}
          storyPoster={storyPoster}
          shareUrl={shareUrl}
          onOpenReport={() => setShowFullReport(true)}
          onCopyShare={() => void copyShare()}
          hasGoogleIdentity={hasGoogleIdentity}
          user={user}
          history={history}
        />
      )}
    </div>
  );
}
