"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavAuthActions } from "@/components/NavAuthActions";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchAttempt, listMyAttempts } from "@/lib/data/attempt-service";
import { tryClaimAttemptForSession } from "@/lib/data/attempt-claim-client";
import { fetchAssessment } from "@/lib/data/assessment-service";
import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { personaCopy, personaLabel } from "@/lib/results/persona-display";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { dimensionRowsForAttempt } from "@/lib/results/dimension-rows";
import { PausibleResultsReport } from "@/components/results/PausibleResultsReport";
import { ResultsBentoSummary } from "@/components/results/ResultsBentoSummary";
import { buildResultsReportModel } from "@/lib/results/build-results-report";
import { useAppSettings } from "@/lib/hooks/useAppSettings";

type ResultsView = "summary" | "report";

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
  const [resultsView, setResultsView] = useState<ResultsView>("summary");

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

  const primaryPersona = attempt?.scores?.archetypeKey;
  const secondaryPersona = attempt?.scores?.secondaryArchetypeKey;
  const primaryCopy = useMemo(() => personaCopy(primaryPersona), [primaryPersona]);
  const secondaryCopy = useMemo(() => personaCopy(secondaryPersona), [secondaryPersona]);
  const personaMix = useMemo(() => {
    const pcts = attempt?.scores?.persona?.personaPercentages;
    if (!pcts) return [];
    return [...PERSONA_KEYS]
      .map((k) => ({ key: k, label: PERSONA_DISPLAY[k].label, pct: pcts[k] ?? 0 }))
      .sort((a, b) => b.pct - a.pct);
  }, [attempt?.scores?.persona]);

  const dimensionRows = useMemo(
    () => (assessment && attempt ? dimensionRowsForAttempt(assessment, attempt) : []),
    [assessment, attempt],
  );

  const posterHostSlug = useMemo(() => {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//i, "").split("/")[0];
    return raw || "pausible.com";
  }, []);

  function archetypeHashtagSlug(label?: string | null) {
    if (!label?.trim()) return "ProfileGlow";
    const fused = label
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .slice(0, 22);
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
    const sum = primaryCopy?.summary?.trim() ?? "";
    const line = sum.length > 160 ? `${sum.slice(0, 157)}…` : sum || "Fitness behavioral spotlight — dimensional mix from your latest assessment.";
    const label = personaLabel(primaryPersona);
    return {
      archetypeLabel: label,
      line,
      dimensions: dimensionRows.slice(0, 6).map((d) => ({ label: d.label, pct: d.pct })),
      hashtags: ["Pausible", `Paus${archetypeHashtagSlug(label)}`, "FitnessMind"],
      siteSlug: `${posterHostSlug} · spotlight`,
    };
  }, [primaryCopy, primaryPersona, dimensionRows, posterHostSlug]);
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

  if (attempt.paymentStatus !== "paid") {
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

  if (resultsView === "report" && reportModel) {
    return (
      <div className="min-h-screen bg-slate-100 scheme-light text-slate-900">
        <ResultsTopBar />
        <PausibleResultsReport
          model={reportModel}
          attemptId={attempt.id}
          onBack={() => setResultsView("summary")}
        />
      </div>
    );
  }

  const secondaryPct =
    secondaryPersona && attempt?.scores?.persona?.personaPercentages[secondaryPersona as PersonaKey] != null
      ? attempt.scores.persona.personaPercentages[secondaryPersona as PersonaKey]
      : null;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-sky-50/30 scheme-light text-slate-900">
      <ResultsTopBar />
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white">
              Summary
            </button>
            <button
              type="button"
              onClick={() => setResultsView("report")}
              disabled={!reportModel}
              className="rounded-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Full report
            </button>
          </div>
          {reportModel ? (
            <p className="text-xs text-slate-500">Your snapshot · full report exports as PDF</p>
          ) : null}
        </div>
        <ResultsBentoSummary
          attempt={attempt}
          attemptId={attemptId}
          primaryPersona={primaryPersona}
          secondaryPersona={secondaryPersona}
          secondaryPct={secondaryPct}
          primaryCopy={primaryCopy}
          secondaryCopy={secondaryCopy}
          personaMix={personaMix}
          dimensionRows={dimensionRows}
          storyPoster={storyPoster}
          shareUrl={shareUrl}
          history={history}
          hasGoogleIdentity={hasGoogleIdentity}
          user={user}
          onCopyShare={() => void copyShare()}
          onOpenReport={() => setResultsView("report")}
          hasReport={Boolean(reportModel)}
        />
      </div>
    </div>
  );
}
