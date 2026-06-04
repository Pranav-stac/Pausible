"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { trackAssessmentComplete } from "@/lib/analytics/track";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, upsertAttempt } from "@/lib/data/attempt-service";
import { claimStorageKey } from "@/lib/data/attempt-claim-client";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { coerceAnswer } from "@/lib/scoring/engine";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { getOrCreateLocalUid } from "@/lib/local/uid";
import { assessmentShellClass, assessmentShellPadClass, WELLNESS_FRESH_ATTEMPT_KEY } from "@/lib/assessment/layout";
import {
  getWellnessContextQuestionnaire,
  WELLNESS_CONTEXT_PREFIX,
  wellnessContextAssessmentId,
} from "@/data/wellness-context-questionnaire";
import type { AssessmentDefinition, AssessmentQuestion, AssessmentSection, AttemptAnswers } from "@/types/models";
import { assessmentTestToolsAllowed, randomAnswersForDefinition } from "@/lib/testing/random-assessment-fill";

function sectionQuestions(
  def: AssessmentDefinition,
  sec: AssessmentSection,
): AssessmentQuestion[] {
  return sec.questionIds
    .map((id) => def.questions[id])
    .filter((q): q is AssessmentQuestion => Boolean(q));
}

function isSectionComplete(
  def: AssessmentDefinition,
  sec: AssessmentSection,
  answers: AttemptAnswers,
): boolean {
  return sectionQuestions(def, sec).every((q) => {
    const raw = answers[q.id];
    if (q.type === "multi") {
      const arr = Array.isArray(raw) ? raw : [];
      return arr.length > 0 && arr.length <= (q.maxSelections ?? Infinity);
    }
    return coerceAnswer(q, raw) !== null;
  });
}

function allSectionsComplete(def: AssessmentDefinition, answers: AttemptAnswers): boolean {
  return def.sections.every((sec) => isSectionComplete(def, sec, answers));
}

export function WellnessContextQuestionnaire({
  attemptId,
  bootstrapQuestionnaire,
}: {
  attemptId: string;
  bootstrapQuestionnaire: AssessmentDefinition | null;
}) {
  const router = useRouter();
  const { effectiveUid, ready, ensureAnonymousSession } = useFirebaseAuth();
  const { requirePayment } = useAppSettings();
  const [localUid, setLocalUid] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<AssessmentDefinition | null>(() =>
    bootstrapQuestionnaire != null ? bootstrapQuestionnaire : null,
  );
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<AttemptAnswers>({});
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [oceanAnswerCount, setOceanAnswerCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setLocalUid(getOrCreateLocalUid()));
  }, []);

  useEffect(() => {
    if (bootstrapQuestionnaire != null) return;

    let cancelled = false;
    void (async () => {
      setQuestionnaireError(null);
      try {
        const fromDb = await fetchAssessment(wellnessContextAssessmentId);
        if (cancelled) return;
        if (fromDb) {
          setQuestionnaire(fromDb);
          return;
        }
        setQuestionnaire(getWellnessContextQuestionnaire());
        setQuestionnaireError(
          `Wellness context (“${wellnessContextAssessmentId}”) is not published in Firestore. Using bundled defaults — open Admin → Assessments → “Sync wellness context” and save.`,
        );
      } catch (e) {
        if (cancelled) return;
        if (!isFirebaseConfigured()) {
          setQuestionnaire(getWellnessContextQuestionnaire());
          setQuestionnaireError(
            "Firebase is not configured; showing bundled wellness context questions (not synced to the cloud).",
          );
          return;
        }
        setQuestionnaire(null);
        setQuestionnaireError(e instanceof Error ? e.message : "Could not load wellness context questionnaire.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapQuestionnaire]);

  const attemptUid = effectiveUid ?? localUid;
  const sections = questionnaire?.sections ?? [];
  const activeSection = sections[activeSectionIndex];
  const activeQuestions = useMemo(
    () => (questionnaire && activeSection ? sectionQuestions(questionnaire, activeSection) : []),
    [questionnaire, activeSection],
  );

  useEffect(() => {
    if (!attemptId || !ready || attemptUid === null || !questionnaire) return;

    let cancelled = false;
    void (async () => {
      setSessionLoading(true);
      setLoadError(null);
      try {
        const attempt = await fetchAttempt(attemptId);
        if (cancelled) return;
        if (!attempt) {
          setLoadError("We could not find your assessment session. Please start again from the home page.");
          return;
        }
        if (attempt.uid !== attemptUid) {
          setLoadError("This session does not match your browser. Use the same device you used for the inventory.");
          return;
        }
        if (attempt.scores?.persona) {
          router.replace(`/after-assessment/${encodeURIComponent(attemptId)}?next=results`);
          return;
        }

        let freshWellness = false;
        try {
          if (typeof window !== "undefined" && sessionStorage.getItem(WELLNESS_FRESH_ATTEMPT_KEY) === attemptId) {
            sessionStorage.removeItem(WELLNESS_FRESH_ATTEMPT_KEY);
            freshWellness = true;
          }
        } catch {
          /* private mode */
        }

        const existing: AttemptAnswers = {};
        let ocean = 0;
        const oceanOnly = Object.fromEntries(
          Object.entries(attempt.answers ?? {}).filter(([key]) => !key.startsWith(WELLNESS_CONTEXT_PREFIX)),
        );
        const wellnessOnly = Object.fromEntries(
          Object.entries(attempt.answers ?? {}).filter(([key]) => key.startsWith(WELLNESS_CONTEXT_PREFIX)),
        );
        const wellnessPrefilled = allSectionsComplete(questionnaire, wellnessOnly);
        const source = freshWellness
          ? wellnessPrefilled
            ? { ...oceanOnly, ...wellnessOnly }
            : oceanOnly
          : (attempt.answers ?? {});

        for (const [key, val] of Object.entries(source)) {
          if (key.startsWith(WELLNESS_CONTEXT_PREFIX)) existing[key] = val;
          else if (val !== undefined && val !== null) ocean += 1;
        }

        if (freshWellness && !wellnessPrefilled && Object.keys(existing).length === 0) {
          const cleaned: AttemptAnswers = { ...source };
          for (const k of Object.keys(cleaned)) {
            if (k.startsWith(WELLNESS_CONTEXT_PREFIX)) delete cleaned[k];
          }
          void upsertAttempt({
            id: attemptId,
            uid: attempt.uid,
            assessmentId: attempt.assessmentId,
            answers: cleaned,
            scores: attempt.scores ?? null,
            personaAnalysis: attempt.personaAnalysis ?? null,
            paymentStatus: attempt.paymentStatus,
            shareToken: attempt.shareToken ?? null,
            isLatestShareEligible: Boolean(attempt.isLatestShareEligible),
          });
        }

        setOceanAnswerCount(ocean);
        setAnswers(existing);
        if (ocean < 1) {
          setLoadError("Personality inventory answers are missing. Please complete the main assessment first.");
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load your session.");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, attemptUid, questionnaire, ready, router]);

  const setAnswer = useCallback((qid: string, value: number | string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const sectionComplete =
    questionnaire && activeSection ? isSectionComplete(questionnaire, activeSection, answers) : false;
  const allComplete = useMemo(
    () => (questionnaire ? allSectionsComplete(questionnaire, answers) : false),
    [questionnaire, answers],
  );
  const isLastSection = activeSectionIndex >= sections.length - 1;

  const handleSubmit = useCallback(async () => {
    if (!allComplete || !attemptUid || !questionnaire) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const attempt = await fetchAttempt(attemptId);
      if (!attempt) throw new Error("Session not found.");
      const merged: AttemptAnswers = { ...attempt.answers, ...answers };

      for (const q of Object.values(questionnaire.questions)) {
        if (coerceAnswer(q, merged[q.id]) === null) {
          throw new Error("Some answers are still incomplete. Please review each section.");
        }
      }

      let saveUid = attemptUid;
      if (isFirebaseConfigured()) {
        const firebaseUid = await ensureAnonymousSession();
        if (!firebaseUid) {
          throw new Error("Could not save your assessment. Please check your connection and try again.");
        }
        saveUid = firebaseUid;
      }

      const personaConfig = await fetchPersonaScoringConfig();
      const scores = computeAttemptScores(merged, personaConfig);
      const personaAnalysis = scores.persona ?? null;

      let claimSecret = "";
      try {
        if (typeof window !== "undefined") {
          claimSecret = localStorage.getItem(claimStorageKey(attemptId)) ?? "";
        }
      } catch {
        /* private mode */
      }
      const claim = claimSecret.length >= 16 ? { claimSecret } : {};

      await upsertAttempt({
        id: attemptId,
        uid: saveUid,
        assessmentId: attempt.assessmentId,
        answers: merged,
        scores,
        personaAnalysis,
        paymentStatus: "pending",
        shareToken: null,
        isLatestShareEligible: false,
        ...claim,
      });

      const pvPath = typeof window !== "undefined" ? window.location.pathname : "/";
      await trackAssessmentComplete({
        uid: saveUid,
        assessmentId: attempt.assessmentId,
        path: pvPath,
        requirePayment,
      });

      const next = requirePayment ? "checkout" : "results";
      router.push(`/after-assessment/${encodeURIComponent(attemptId)}?next=${next}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    allComplete,
    answers,
    attemptId,
    attemptUid,
    ensureAnonymousSession,
    questionnaire,
    requirePayment,
    router,
  ]);

  const progressPct = Math.round(
    ((activeSectionIndex + (sectionComplete ? 1 : 0)) / Math.max(1, sections.length)) * 100,
  );

  const showTestFill = assessmentTestToolsAllowed();

  const fillAllRandomTesting = useCallback(() => {
    if (!questionnaire || !attemptUid) return;
    const next = randomAnswersForDefinition(questionnaire);
    setAnswers((prev) => ({ ...prev, ...next }));
    setActiveSectionIndex(Math.max(0, sections.length - 1));

    void (async () => {
      try {
        const attempt = await fetchAttempt(attemptId);
        if (!attempt || attempt.uid !== attemptUid) return;
        const merged: AttemptAnswers = { ...attempt.answers, ...next };
        let claimSecret = "";
        try {
          if (typeof window !== "undefined") {
            claimSecret = localStorage.getItem(claimStorageKey(attemptId)) ?? "";
          }
        } catch {
          /* private mode */
        }
        const claim = claimSecret.length >= 16 ? { claimSecret } : {};
        await upsertAttempt({
          id: attemptId,
          uid: attemptUid,
          assessmentId: attempt.assessmentId,
          answers: merged,
          scores: attempt.scores ?? null,
          personaAnalysis: attempt.personaAnalysis ?? null,
          paymentStatus: attempt.paymentStatus,
          shareToken: attempt.shareToken ?? null,
          isLatestShareEligible: Boolean(attempt.isLatestShareEligible),
          ...claim,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [attemptId, attemptUid, questionnaire, sections.length]);

  const loading = sessionLoading || !questionnaire;

  if (!ready || attemptUid === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Preparing your session…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading questionnaire…
      </div>
    );
  }

  if (questionnaireError && !questionnaire) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-700">{questionnaireError}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-sky-700">
          ← Back to home
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-sky-700">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-emerald-50/40 pb-32">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-col gap-2 py-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
              <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-[1.05rem]" />
            </Link>
            <div className="flex items-center gap-2">
              {showTestFill ? (
                <button
                  type="button"
                  title="Development / QA only — fills all wellness context sections"
                  onClick={fillAllRandomTesting}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:text-xs"
                >
                  Fill all (test)
                </button>
              ) : null}
              <span className="text-[11px] font-semibold text-slate-600">Step 2 of 2 · Context</span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">{questionnaire.title}</h1>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
              {oceanAnswerCount > 0
                ? "Almost done — tell us about your lifestyle so we can personalize your results."
                : questionnaire.description}
            </p>
          </div>
          {questionnaireError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              {questionnaireError}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">
              Section {activeSectionIndex + 1}/{sections.length}
            </span>
          </div>
        </div>
      </header>

      <main className={`${assessmentShellClass} ${assessmentShellPadClass} py-8 sm:py-10`}>
        <div className="lg:grid lg:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10">
          <nav
            className="mb-6 flex flex-wrap gap-2 lg:sticky lg:top-[11.5rem] lg:mb-0 lg:flex-col lg:gap-1.5"
            aria-label="Questionnaire sections"
          >
            {sections.map((sec, i) => {
              const done = isSectionComplete(questionnaire, sec, answers);
              const current = i === activeSectionIndex;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSectionIndex(i)}
                  className={`rounded-xl border px-3 py-2 text-left text-[10px] font-semibold transition sm:text-xs lg:w-full ${
                    current
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm"
                      : done
                        ? "border-emerald-200 bg-white text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {done && !current ? "✓ " : null}
                  {i + 1}. {sec.title.replace(/^Section \d+ — /, "")}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0">
        {activeSection ? (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.18)] sm:p-8 lg:p-10">
            <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">{activeSection.title}</h2>
            {activeSection.description ? (
              <p className="mt-2 text-sm text-slate-600">{activeSection.description}</p>
            ) : null}

            <div className="mt-8 flex flex-col gap-10">
              {activeQuestions.map((q, qi) => (
                <div key={q.id} className="border-t border-slate-100 pt-8 first:border-t-0 first:pt-0">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Question {qi + 1} of {activeQuestions.length} in this section
                  </p>
                  <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900 sm:text-lg">{q.prompt}</h3>
                  {q.caption ? <p className="mt-1 text-xs font-medium text-slate-500">{q.caption}</p> : null}

                  <div className="mt-5 max-w-3xl">
                    {q.type === "likert" ? (
                      <StressLikertScale
                        scaleMin={q.scaleMin ?? 1}
                        scaleMax={q.scaleMax ?? 7}
                        minLabel={q.scaleMinLabel ?? "Low"}
                        maxLabel={q.scaleMaxLabel ?? "High"}
                        value={typeof answers[q.id] === "number" ? (answers[q.id] as number) : undefined}
                        onChange={(n) => setAnswer(q.id, n)}
                      />
                    ) : null}
                    {q.type === "single" ? (
                      <SingleChoice
                        options={q.options ?? []}
                        value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : undefined}
                        onChange={(v) => setAnswer(q.id, v)}
                      />
                    ) : null}
                    {q.type === "multi" ? (
                      <MultiChoiceLimited
                        options={q.options ?? []}
                        maxSelections={q.maxSelections}
                        value={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []}
                        onChange={(v) => setAnswer(q.id, v)}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {submitError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800">
            {submitError}
          </p>
        ) : null}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/75 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-wrap items-center justify-between gap-3`}>
          <button
            type="button"
            disabled={activeSectionIndex === 0}
            onClick={() => setActiveSectionIndex((i) => Math.max(0, i - 1))}
            className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-40"
          >
            Previous section
          </button>

          {isLastSection ? (
            <button
              type="button"
              disabled={!allComplete || submitting}
              onClick={() => void handleSubmit()}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
            >
              {submitting
                ? "Running your results…"
                : requirePayment
                  ? "Submit & continue to checkout"
                  : "Submit & unlock results"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!sectionComplete}
              onClick={() => setActiveSectionIndex((i) => Math.min(sections.length - 1, i + 1))}
              className="rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-40"
            >
              Next section
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function StressLikertScale({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 7,
  minLabel,
  maxLabel,
}: {
  value?: number;
  onChange: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
  minLabel: string;
  maxLabel: string;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);
  const colTemplate = `repeat(${nums.length}, minmax(0, 1fr))`;

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2 text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">
        <span className="min-w-0 shrink text-left">
          {min} = {minLabel}
        </span>
        <span className="min-w-0 shrink text-right">
          {max} = {maxLabel}
        </span>
      </div>
      <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: colTemplate }}>
        {nums.map((n) => {
          const pressed = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={pressed}
              className={`flex min-h-[2.75rem] w-full flex-col items-center justify-center rounded-xl border px-0.5 py-2.5 text-sm font-bold transition sm:min-h-[3.1rem] sm:rounded-2xl sm:text-base ${
                pressed
                  ? "border-transparent bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-900 hover:border-emerald-400/70"
              }`}
            >
              <span className="tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SingleChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-2 lg:gap-2.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex w-full min-h-[3rem] items-center rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-emerald-500 bg-emerald-50/80 text-slate-900 shadow-inner"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceLimited({
  options,
  value,
  maxSelections,
  onChange,
}: {
  options: string[];
  value: string[];
  maxSelections?: number;
  onChange: (v: string[]) => void;
}) {
  const cap = maxSelections ?? options.length;
  const atCap = value.length >= cap;

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((x) => x !== opt));
      return;
    }
    if (atCap) return;
    onChange([...value, opt]);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        {value.length}/{cap} selected{maxSelections ? ` (max ${maxSelections})` : ""}
      </p>
      {options.map((opt) => {
        const active = value.includes(opt);
        const disabled = !active && atCap;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt)}
            className={`flex w-full min-h-[3rem] items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-teal-500 bg-teal-50 text-slate-900"
                : disabled
                  ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            <span>{opt}</span>
            <span className="text-[11px] font-semibold text-slate-500">
              {active ? "Selected" : disabled ? "Limit reached" : "Tap"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
