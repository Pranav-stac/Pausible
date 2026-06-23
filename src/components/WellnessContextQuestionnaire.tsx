"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { trackAssessmentComplete } from "@/lib/analytics/track";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, upsertAttempt } from "@/lib/data/attempt-service";
import { claimStorageKey } from "@/lib/data/attempt-claim-client";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { coerceAnswer, normalizeAnswersForQuestionnaire } from "@/lib/scoring/engine";
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

function flattenQuestions(def: AssessmentDefinition): AssessmentQuestion[] {
  const order: AssessmentQuestion[] = [];
  for (const sec of def.sections) {
    for (const qid of sec.questionIds) {
      const q = def.questions[qid];
      if (q) order.push(q);
    }
  }
  return order;
}

function allSectionsComplete(def: AssessmentDefinition, answers: AttemptAnswers): boolean {
  return def.sections.every((sec) =>
    sec.questionIds.every((qid) => {
      const q = def.questions[qid];
      return q ? coerceAnswer(q, answers[q.id]) !== null : true;
    }),
  );
}

function computeInitialRevealedCount(questions: AssessmentQuestion[], answers: AttemptAnswers): number {
  for (let i = 0; i < questions.length; i++) {
    if (coerceAnswer(questions[i], answers[questions[i].id]) === null) {
      return Math.max(1, i + 1);
    }
  }
  return Math.max(1, questions.length);
}

function summarizeAnswerSnippet(q: AssessmentQuestion, raw: unknown): string {
  const coerced = coerceAnswer(q, raw as number | string | string[] | undefined);
  if (coerced === null) return "";
  if (q.type === "likert") return `Chosen: ${coerced}`;
  if (q.type === "single") {
    const s = String(coerced);
    return s.length > 48 ? `${s.slice(0, 46)}…` : s;
  }
  if (q.type === "multi" && Array.isArray(coerced)) return `${coerced.length} selected`;
  return "";
}

function sectionHeaderForQuestion(
  def: AssessmentDefinition,
  questionId: string,
): Pick<AssessmentSection, "title" | "description"> | null {
  for (const sec of def.sections) {
    if (sec.questionIds[0] === questionId) {
      return { title: sec.title, description: sec.description };
    }
  }
  return null;
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
  const [revealedCount, setRevealedCount] = useState(1);
  const [expandedPastIndex, setExpandedPastIndex] = useState<number | null>(null);
  const [oceanAnswerCount, setOceanAnswerCount] = useState(0);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

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
  const questions = useMemo(() => (questionnaire ? flattenQuestions(questionnaire) : []), [questionnaire]);
  const total = questions.length;

  const answeredCount = useMemo(
    () => questions.reduce((n, q) => n + (coerceAnswer(q, answers[q.id]) !== null ? 1 : 0), 0),
    [questions, answers],
  );

  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

  useEffect(() => {
    queueMicrotask(() => setExpandedPastIndex(null));
  }, [revealedCount]);

  useLayoutEffect(() => {
    if (revealedCount < 1 || typeof window === "undefined") return;
    const idx = revealedCount - 1;
    let frame2 = 0;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        const el = questionRefs.current[idx];
        if (el)
          el.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
            inline: "nearest",
          });
      });
    });
    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [revealedCount]);

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

        const flat = flattenQuestions(questionnaire);
        setOceanAnswerCount(ocean);
        setAnswers(existing);
        setRevealedCount(computeInitialRevealedCount(flat, existing));
        setExpandedPastIndex(null);
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

  const tryRevealNextAfterIndex = useCallback(
    (answeredIndex: number) => {
      setRevealedCount((r) => (answeredIndex === r - 1 && r < total ? r + 1 : r));
    },
    [total],
  );

  const scrollToQuestion = useCallback((index: number) => {
    questionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPreviousBlock = useCallback(() => {
    if (revealedCount < 2) return;
    scrollToQuestion(Math.max(0, revealedCount - 2));
  }, [revealedCount, scrollToQuestion]);

  const allComplete = useMemo(
    () => (questionnaire ? allSectionsComplete(questionnaire, answers) : false),
    [questionnaire, answers],
  );

  const canScrollPrev = revealedCount >= 2;
  const showCompletion = revealedCount >= total;

  const handleSubmit = useCallback(async () => {
    if (!allComplete || !attemptUid || !questionnaire) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const attempt = await fetchAttempt(attemptId);
      if (!attempt) throw new Error("Session not found.");
      const merged: AttemptAnswers = normalizeAnswersForQuestionnaire(questionnaire, {
        ...attempt.answers,
        ...answers,
      });

      for (const q of Object.values(questionnaire.questions)) {
        if (coerceAnswer(q, merged[q.id]) === null) {
          throw new Error("Some answers are still incomplete. Please review each question.");
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

      const afterNext = requirePayment ? "checkout" : "results";
      const afterPath = `/after-assessment/${encodeURIComponent(attemptId)}?next=${afterNext}`;
      router.push(
        `/submission-confirmed/${encodeURIComponent(attemptId)}?next=${encodeURIComponent(afterPath)}`,
      );
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

  const loading = sessionLoading || !questionnaire;
  const marginUnderHeader = "scroll-mt-[10.75rem] sm:scroll-mt-[12.5rem]";

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
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-emerald-50/40 pb-[10rem] sm:pb-44">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-col gap-2 py-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
              <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-[1.05rem]" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Step 2 of 2 · Context</span>
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">{questionnaire.title}</h1>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
              {oceanAnswerCount > 0
                ? "Almost done — answer one question at a time. Scroll up anytime to review."
                : questionnaire.description}
            </p>
          </div>
          {questionnaireError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-950">
              {questionnaireError}
            </p>
          ) : null}
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">{progressPct}%</span>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canScrollPrev}
              onClick={() => scrollToPreviousBlock()}
              className="min-h-[40px] rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 sm:text-sm"
            >
              ↑ Earlier question
            </button>
          </div>
        </div>
      </header>

      <main className={`relative z-10 ${assessmentShellClass} ${assessmentShellPadClass} py-8 sm:py-10`}>
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          {questions.slice(0, revealedCount).map((q, idx) => {
            const raw = answers[q.id];
            const likertVal = q.type === "likert" && typeof raw === "number" ? raw : undefined;
            const singleVal = q.type === "single" && typeof raw === "string" ? raw : undefined;
            const multiVal = q.type === "multi" && Array.isArray(raw) ? (raw as string[]) : [];
            const activeIdx = revealedCount - 1;
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            const pastAnswered = isPast && coerceAnswer(q, raw) !== null;
            const snippet = summarizeAnswerSnippet(q, raw);
            const sectionHeader = questionnaire ? sectionHeaderForQuestion(questionnaire, q.id) : null;

            if (pastAnswered && expandedPastIndex !== idx) {
              return (
                <div key={q.id}>
                  {sectionHeader ? (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700/80">
                      {sectionHeader.title.replace(/^Section \d+ — /, "")}
                    </p>
                  ) : null}
                  <div
                    ref={(el) => {
                      questionRefs.current[idx] = el;
                    }}
                    className={marginUnderHeader}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200/95 bg-white/95 px-4 py-3 text-left shadow-sm ring-1 ring-slate-100/85 transition-colors hover:border-emerald-300/70 hover:bg-white active:bg-emerald-50/40 sm:rounded-3xl sm:py-3.5"
                      onClick={() => {
                        setExpandedPastIndex(idx);
                        window.requestAnimationFrame(() => {
                          questionRefs.current[idx]?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                            inline: "nearest",
                          });
                        });
                      }}
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Question {idx + 1} of {total} · Answered
                        </span>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-800">{q.prompt}</p>
                        {snippet ? <p className="mt-1.5 truncate text-xs text-slate-500">{snippet}</p> : null}
                        <p className="mt-2 text-[11px] font-semibold text-emerald-700">Tap to change answer</p>
                      </span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={q.id}>
                {sectionHeader ? (
                  <div className={`mb-3 ${idx === 0 ? "" : "mt-2"}`}>
                    <h2 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">{sectionHeader.title}</h2>
                    {sectionHeader.description ? (
                      <p className="mt-1 text-xs text-slate-600 sm:text-sm">{sectionHeader.description}</p>
                    ) : null}
                  </div>
                ) : null}
                <div
                  ref={(el) => {
                    questionRefs.current[idx] = el;
                  }}
                  className={marginUnderHeader}
                >
                  <article
                    className={`rounded-3xl border bg-white p-5 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.18)] sm:p-8 ${
                      isActive
                        ? "border-emerald-300/80 ring-2 ring-emerald-400/45 ring-offset-2 ring-offset-slate-50"
                        : "border-slate-200/80"
                    }`}
                  >
                    {isPast && expandedPastIndex === idx ? (
                      <div className="-mt-1 mb-4 flex justify-end">
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-teal-800"
                          onClick={() => setExpandedPastIndex(null)}
                        >
                          Collapse summary
                        </button>
                      </div>
                    ) : null}
                    <p className="mb-3 text-[11px] font-semibold tabular-nums tracking-wide text-slate-500 sm:text-xs">
                      Question {idx + 1} of {total}
                      {isActive ? <span className="ml-2 font-bold text-emerald-700">· Current</span> : null}
                    </p>
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">{q.prompt}</h3>
                    {q.caption ? <p className="mt-2 text-xs font-medium text-slate-500">{q.caption}</p> : null}

                    <div className="mt-7 max-w-3xl">
                      {q.type === "likert" ? (
                        <StressLikertScale
                          scaleMin={q.scaleMin ?? 1}
                          scaleMax={q.scaleMax ?? 7}
                          minLabel={q.scaleMinLabel ?? "Low"}
                          maxLabel={q.scaleMaxLabel ?? "High"}
                          value={likertVal}
                          onChange={(n) => {
                            setAnswer(q.id, n);
                            if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                          }}
                        />
                      ) : null}
                      {q.type === "single" ? (
                        <SingleChoice
                          options={q.options ?? []}
                          value={singleVal}
                          onChange={(v) => {
                            setAnswer(q.id, v);
                            if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                          }}
                        />
                      ) : null}
                      {q.type === "multi" ? (
                        <MultiChoiceAdvance
                          options={q.options ?? []}
                          maxSelections={q.maxSelections}
                          value={multiVal}
                          onAnswersChange={(v) => setAnswer(q.id, v)}
                          onContinue={(selected) => {
                            if (!selected.length) return;
                            if (coerceAnswer(q, selected) === null) return;
                            if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                          }}
                        />
                      ) : null}
                    </div>
                  </article>
                </div>
              </div>
            );
          })}

          {!showCompletion && revealedCount < total
            ? questions.slice(revealedCount, Math.min(revealedCount + 2, total)).map((q, k) => {
                const qi = revealedCount + k;
                return <UpcomingQuestionPreview key={q.id} q={q} qNum={qi + 1} total={total} />;
              })
            : null}

          {showCompletion ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_18px_48px_-32px_rgba(15,23,42,0.14)]">
              <p className="text-lg font-semibold text-slate-900">You&apos;ve reached the end</p>
              <p className="mt-2 text-sm text-slate-600">
                {allComplete
                  ? "Tap answered rows above if you want to change anything, then submit when you're ready."
                  : "Some answers still look incomplete."}
              </p>
            </div>
          ) : null}

          {submitError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800">
              {submitError}
            </p>
          ) : null}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/75 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-col gap-2`}>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="text-[11px] font-medium text-slate-700">
              {answeredCount}/{total} answered
            </p>
            <button
              type="button"
              disabled={!allComplete || submitting}
              onClick={() => void handleSubmit()}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-40"
            >
              {submitting ? "Saving your responses…" : "Submit responses"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function UpcomingQuestionPreview({ q, qNum, total }: { q: AssessmentQuestion; qNum: number; total: number }) {
  return (
    <div
      className="pointer-events-none select-none rounded-3xl border border-dashed border-slate-300/90 bg-white/72 p-5 shadow-inner shadow-slate-200/30 saturate-[0.9] sm:p-7"
      aria-hidden
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Preview · up next</p>
      <p className="mt-2 text-[11px] font-semibold tabular-nums tracking-wide text-slate-400 sm:text-xs">
        Question {qNum} of {total}
      </p>
      <h3 className="mt-3 text-sm font-semibold leading-snug text-slate-500 sm:text-[0.95rem]">{q.prompt}</h3>
      {q.type === "likert" ? (
        <p className="mt-6 text-xs leading-relaxed text-slate-400">Choose a number once you reach this step.</p>
      ) : null}
      {q.type === "single" ? (
        <p className="mt-6 text-xs leading-relaxed text-slate-400">Tap an option once you reach this step.</p>
      ) : null}
      {q.type === "multi" ? (
        <p className="mt-6 text-xs leading-relaxed text-slate-400">Select options once you unlock this prompt.</p>
      ) : null}
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

function MultiChoiceAdvance({
  options,
  value,
  maxSelections,
  onAnswersChange,
  onContinue,
}: {
  options: string[];
  value: string[];
  maxSelections?: number;
  onAnswersChange: (v: string[]) => void;
  onContinue: (selected: string[]) => void;
}) {
  const cap = maxSelections ?? options.length;
  const atCap = value.length >= cap;

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onAnswersChange(value.filter((x) => x !== opt));
      return;
    }
    if (atCap) return;
    onAnswersChange([...value, opt]);
  };

  const canContinue = value.length > 0;

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
      <p className="text-xs text-slate-500">Select any that apply, then continue.</p>
      <button
        type="button"
        disabled={!canContinue}
        onClick={() => onContinue(value)}
        className="mt-2 w-full rounded-full bg-emerald-700 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
