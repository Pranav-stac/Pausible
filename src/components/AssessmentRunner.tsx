"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ACTIVE_CARD_RING,
  APP_HEADER,
  APP_PAGE_BG_SOFT,
  BRAND_ACCENT_TEXT,
  CTA_PRIMARY_CLASS,
  PROGRESS_FILL_CLASS,
  PROGRESS_TRACK_CLASS,
} from "@/components/marketing/marketing-brand";
import { trackAssessmentComplete, trackAssessmentStart } from "@/lib/analytics/track";
import { assessmentShellClass, assessmentShellPadClass } from "@/lib/assessment/layout";
import { getWellnessContextQuestionnaire, WELLNESS_CONTEXT_PREFIX } from "@/data/wellness-context-questionnaire";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt } from "@/lib/data/attempt-service";
import { SESSION_ATTEMPT_CLAIM_KEY, claimStorageKey } from "@/lib/data/attempt-claim-client";
import { upsertAttempt } from "@/lib/data/attempt-service";
import type { AssessmentDefinition, AssessmentQuestion, AttemptAnswers } from "@/types/models";
import { WELLNESS_FRESH_ATTEMPT_KEY } from "@/lib/assessment/layout";
import { coerceAnswer } from "@/lib/scoring/engine";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { defaultAssessmentId } from "@/data/default-assessment";
import { assessmentTestToolsAllowed, randomAnswersForQuestions } from "@/lib/testing/random-assessment-fill";
import { getOrCreateLocalUid } from "@/lib/local/uid";
import {
  clearOceanProgress,
  loadOceanProgress,
  mergeProfileDraftIntoAnswers,
  saveOceanProgress,
} from "@/lib/assessment/session-recovery";

const DEBOUNCE_SAVE_MS = 400;

function flattenQuestions(a: AssessmentDefinition): AssessmentQuestion[] {
  const order: AssessmentQuestion[] = [];
  for (const sec of a.sections) {
    for (const qid of sec.questionIds) {
      const q = a.questions[qid];
      if (q) order.push(q);
    }
  }
  return order;
}

export function AssessmentRunner({
  assessmentId,
  bootstrapAssessment,
  bootstrapRequirePayment,
}: {
  assessmentId: string;
  bootstrapAssessment: AssessmentDefinition | null;
  bootstrapRequirePayment: boolean | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeAttemptId = searchParams.get("resume");
  const focusQuestionId = searchParams.get("q");
  const returnPath = searchParams.get("return");
  const editMode = Boolean(resumeAttemptId && returnPath);
  const { effectiveUid, ready, ensureAnonymousSession } = useFirebaseAuth();
  const serverPaymentHint = typeof bootstrapRequirePayment === "boolean" ? bootstrapRequirePayment : undefined;
  const { requirePayment } = useAppSettings(serverPaymentHint);
  const [assessment, setAssessment] = useState<AssessmentDefinition | null>(() =>
    bootstrapAssessment != null ? bootstrapAssessment : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string | string[]>>({});
  const [localUid, setLocalUid] = useState<string | null>(null);
  /** Renders question cards 0..revealedCount-1; increments when the latest visible question is answered. */
  const [revealedCount, setRevealedCount] = useState(1);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const attemptIdRef = useRef("");
  /** Same-tab proof stored on the attempt so Google sign-in can reclaim this run (see /api/attempts/claim). */
  const claimSecretRef = useRef("");
  const startTrackedRef = useRef<string | null>(null);
  const assessmentSessionIdRef = useRef<string | null>(null);
  const resumeLoadedRef = useRef(false);
  const focusAppliedRef = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setLocalUid(getOrCreateLocalUid()));
  }, []);

  const attemptUid = effectiveUid ?? localUid;

  useEffect(() => {
    if (!assessment?.id || !attemptUid) return;
    if (startTrackedRef.current === assessment.id) return;
    startTrackedRef.current = assessment.id;
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    void trackAssessmentStart({ uid: attemptUid, assessmentId: assessment.id, path });
  }, [assessment, attemptUid]);

  useEffect(() => {
    if (!assessment?.id) return;
    if (assessmentSessionIdRef.current === assessment.id) return;
    assessmentSessionIdRef.current = assessment.id;
    if (resumeAttemptId) return;

    const saved = loadOceanProgress(assessment.id);
    if (saved?.attemptId) {
      attemptIdRef.current = saved.attemptId;
      setAnswers(saved.answers);
      setRevealedCount(Math.max(1, saved.revealedCount));
    } else {
      attemptIdRef.current = crypto.randomUUID();
      setAnswers({});
      setRevealedCount(1);
    }
    claimSecretRef.current = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(claimStorageKey(attemptIdRef.current), claimSecretRef.current);
        sessionStorage.setItem(
          SESSION_ATTEMPT_CLAIM_KEY,
          JSON.stringify({ attemptId: attemptIdRef.current, claimSecret: claimSecretRef.current }),
        );
      }
    } catch {
      /* quota / private mode */
    }
  }, [assessment?.id, resumeAttemptId]);

  useEffect(() => {
    if (!assessment?.id || !resumeAttemptId || resumeLoadedRef.current || !attemptUid) return;
    resumeLoadedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const attempt = await fetchAttempt(resumeAttemptId);
        if (cancelled || !attempt) return;

        attemptIdRef.current = resumeAttemptId;
        const flat = flattenQuestions(assessment);
        const restored: Record<string, number | string | string[]> = {};
        for (const q of flat) {
          const val = attempt.answers?.[q.id];
          if (val !== undefined && val !== null) restored[q.id] = val as number | string | string[];
        }

        setAnswers(restored);
        setRevealedCount(flat.length);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assessment, attemptUid, resumeAttemptId]);

  useEffect(() => {
    if (bootstrapAssessment != null) return;

    let cancelled = false;
    void (async () => {
      try {
        const a = await fetchAssessment(assessmentId || defaultAssessmentId);
        if (!cancelled) {
          if (!a) {
            setLoadError(
              `This assessment (“${assessmentId || defaultAssessmentId}”) is not in Firestore or is paused. Open Admin → “Sync default from question.json”, or publish the assessment there.`,
            );
          } else {
            setAssessment(a);
          }
        }
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Failed to load assessment from Firestore");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, bootstrapAssessment]);

  const questions = useMemo(() => (assessment ? flattenQuestions(assessment) : []), [assessment]);
  const total = questions.length;

  const answeredCount = useMemo(() => {
    return questions.reduce((n, q) => n + (coerceAnswer(q, answers[q.id]) !== null ? 1 : 0), 0);
  }, [questions, answers]);

  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  const setAnswer = useCallback((qid: string, value: number | string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  useEffect(() => {
    if (!focusQuestionId || !questions.length || focusAppliedRef.current) return;
    const idx = questions.findIndex((q) => q.id === focusQuestionId);
    if (idx < 0) return;
    focusAppliedRef.current = true;
    setRevealedCount((prev) => Math.max(prev, idx + 1));
    window.requestAnimationFrame(() => {
      questionRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    });
  }, [focusQuestionId, questions]);

  useEffect(() => {
    if (!assessment?.id || !attemptIdRef.current) return;
    saveOceanProgress({
      attemptId: attemptIdRef.current,
      assessmentId: assessment.id,
      answers,
      revealedCount,
      updatedAt: new Date().toISOString(),
    });
  }, [answers, assessment?.id, revealedCount]);

  const tryRevealNextAfterIndex = useCallback((answeredIndex: number) => {
    setRevealedCount((r) => (answeredIndex === r - 1 && r < total ? r + 1 : r));
  }, [total]);

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
    if (!assessment || !attemptUid || !attemptIdRef.current) return;

    const id = attemptIdRef.current;
    const claim =
      claimSecretRef.current.length >= 16 ? { claimSecret: claimSecretRef.current } : {};
    const profileOnly = mergeProfileDraftIntoAnswers({});
    const hasAnswers = Object.keys(answers).length > 0;
    if (!hasAnswers && !Object.keys(profileOnly).length) return;

    const t = window.setTimeout(() => {
      void (async () => {
        const payload: AttemptAnswers = mergeProfileDraftIntoAnswers({ ...answers });
        try {
          const prev = await fetchAttempt(id);
          if (prev?.answers) {
            for (const [key, val] of Object.entries(prev.answers)) {
              if (key.startsWith(WELLNESS_CONTEXT_PREFIX)) payload[key] = val;
            }
          }
        } catch {
          /* ignore */
        }
        await upsertAttempt({
          id,
          uid: attemptUid,
          assessmentId: assessment.id,
          answers: payload,
          scores: null,
          paymentStatus: "pending",
          shareToken: null,
          isLatestShareEligible: false,
          ...claim,
        });
      })();
    }, DEBOUNCE_SAVE_MS);

    return () => window.clearTimeout(t);
  }, [answers, assessment, attemptUid]);

  const handleFinish = useCallback(async () => {
    if (!assessment || !attemptUid || !attemptIdRef.current) return;

    const merged: Record<string, number | string | string[]> = {};
    for (const q of questions) {
      const c = coerceAnswer(q, answers[q.id]);
      if (c === null) return;
      merged[q.id] = c;
    }
    const withProfile = mergeProfileDraftIntoAnswers(merged);

    let saveUid = attemptUid;
    if (isFirebaseConfigured()) {
      const firebaseUid = await ensureAnonymousSession();
      if (!firebaseUid) {
        throw new Error("Could not save your assessment. Please check your connection and try again.");
      }
      saveUid = firebaseUid;
    }

    const id = attemptIdRef.current;
    const claim =
      claimSecretRef.current.length >= 16 ? { claimSecret: claimSecretRef.current } : {};

    const proceedToWellnessContext = assessment.id === defaultAssessmentId;

    if (proceedToWellnessContext) {
      await upsertAttempt({
        id,
        uid: saveUid,
        assessmentId: assessment.id,
        answers: withProfile,
        scores: null,
        paymentStatus: "pending",
        shareToken: null,
        isLatestShareEligible: false,
        ...claim,
      });
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(WELLNESS_FRESH_ATTEMPT_KEY, id);
        }
      } catch {
        /* private mode */
      }
      clearOceanProgress();
      router.push(`/transition/${encodeURIComponent(id)}`);
      return;
    }

    const personaConfig = await fetchPersonaScoringConfig();
    const scores = computeAttemptScores(merged, personaConfig);
    const personaAnalysis = scores.persona ?? null;

    await upsertAttempt({
      id,
      uid: saveUid,
      assessmentId: assessment.id,
      answers: withProfile,
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
      assessmentId: assessment.id,
      path: pvPath,
      requirePayment,
    });

    const next = requirePayment ? "checkout" : "results";
    router.push(`/after-assessment/${encodeURIComponent(id)}?next=${next}`);
  }, [answers, assessment, attemptUid, ensureAnonymousSession, questions, requirePayment, router]);

  const handleSaveAndReturn = useCallback(async () => {
    if (!assessment || !attemptUid || !attemptIdRef.current || !returnPath) return;

    const merged: Record<string, number | string | string[]> = {};
    for (const q of questions) {
      const c = coerceAnswer(q, answers[q.id]);
      if (c === null) throw new Error("Some answers are still incomplete. Please review each question.");
      merged[q.id] = c;
    }

    let saveUid = attemptUid;
    if (isFirebaseConfigured()) {
      const firebaseUid = await ensureAnonymousSession();
      if (!firebaseUid) {
        throw new Error("Could not save your assessment. Please check your connection and try again.");
      }
      saveUid = firebaseUid;
    }

    const id = attemptIdRef.current;
    const prev = await fetchAttempt(id);
    if (!prev) throw new Error("Session not found.");

    const payload: AttemptAnswers = { ...(prev.answers ?? {}), ...mergeProfileDraftIntoAnswers(merged) };
    const personaConfig = await fetchPersonaScoringConfig();
    const scores = computeAttemptScores(payload, personaConfig);
    const personaAnalysis = scores.persona ?? null;

    let claimSecret = "";
    try {
      if (typeof window !== "undefined") {
        claimSecret = localStorage.getItem(claimStorageKey(id)) ?? "";
      }
    } catch {
      /* private mode */
    }
    const claim = claimSecret.length >= 16 ? { claimSecret } : {};

    await upsertAttempt({
      id,
      uid: saveUid,
      assessmentId: prev.assessmentId,
      answers: payload,
      scores,
      personaAnalysis,
      paymentStatus: prev.paymentStatus,
      shareToken: prev.shareToken ?? null,
      isLatestShareEligible: Boolean(prev.isLatestShareEligible),
      ...claim,
    });

    router.push(returnPath);
  }, [answers, assessment, attemptUid, ensureAnonymousSession, questions, returnPath, router]);

  const fillAllRandomTesting = useCallback(() => {
    if (!questions.length || !assessment || !attemptUid) return;
    const next = randomAnswersForQuestions(questions);
    setAnswers(next);
    setRevealedCount(questions.length);

    const id = attemptIdRef.current;
    if (!id) return;
    void (async () => {
      let merged: AttemptAnswers = mergeProfileDraftIntoAnswers({ ...next });
      try {
        const prev = await fetchAttempt(id);
        if (prev?.answers) merged = { ...prev.answers, ...next };
      } catch {
        /* ignore */
      }
      const claim =
        claimSecretRef.current.length >= 16 ? { claimSecret: claimSecretRef.current } : {};
      await upsertAttempt({
        id,
        uid: attemptUid,
        assessmentId: assessment.id,
        answers: merged,
        scores: null,
        paymentStatus: "pending",
        shareToken: null,
        isLatestShareEligible: false,
        ...claim,
      });
    })();
  }, [assessment, attemptUid, questions]);

  const showTestFill = assessmentTestToolsAllowed();

  const canFinish = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q) => coerceAnswer(q, answers[q.id]) !== null);
  }, [questions, answers]);

  if (!ready || attemptUid === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Preparing your session…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-1.5 py-16 text-center text-sm text-red-600 sm:px-2">
        {loadError}
      </div>
    );
  }

  if (!assessment || !total) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading assessment…
      </div>
    );
  }

  const showCompletion = revealedCount >= total;

  return (
    <div className={`${APP_PAGE_BG_SOFT} pb-[10rem] sm:pb-44`}>
      <header className={APP_HEADER}>
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-col gap-2 py-3`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center rounded-lg outline-offset-4" aria-label="Pausible home">
              <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-[1.05rem]" />
            </Link>
            <div className="flex items-center gap-2">
              {editMode && returnPath ? (
                <Link
                  href={returnPath}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back to review
                </Link>
              ) : null}
              {showTestFill ? (
              <button
                type="button"
                title="Development / QA only — fills personality inventory only"
                onClick={fillAllRandomTesting}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:text-xs lg:hidden"
              >
                Fill personas (test)
              </button>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className={PROGRESS_TRACK_CLASS}>
              <div className={PROGRESS_FILL_CLASS} style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#4D4D4D]">{progress}%</span>
          </div>

        </div>
      </header>

      <main className={`relative z-10 ${assessmentShellClass} ${assessmentShellPadClass} py-8 sm:py-10`}>
        <div className="flex flex-col gap-3 sm:gap-4 lg:grid lg:grid-cols-[minmax(10.5rem,12.5rem)_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[13rem_1fr] xl:gap-10">
          <aside className="hidden lg:flex lg:flex-col lg:gap-3 lg:sticky lg:top-[11.5rem] lg:self-start">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Your progress</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{progress}%</p>
              <p className="mt-1 text-sm text-slate-600">
                {answeredCount} of {total} answered
              </p>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                One question at a time — scroll up anytime to review earlier answers.
              </p>
            </div>
            {showTestFill ? (
              <button
                type="button"
                title="Development / QA only — fills personality inventory and wellness context (step 2)"
                onClick={fillAllRandomTesting}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-white"
              >
                Fill all (test)
              </button>
            ) : null}
          </aside>
          <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          {questions.slice(0, revealedCount).map((q, idx) => {
            const raw = answers[q.id];
            const likertVal = q.type === "likert" && typeof raw === "number" ? raw : undefined;
            const singleVal = q.type === "single" && typeof raw === "string" ? raw : undefined;
            const multiVal = q.type === "multi" && Array.isArray(raw) ? (raw as string[]) : [];
            const activeIdx = revealedCount - 1;
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            const marginUnderHeader = "scroll-mt-[10.75rem] sm:scroll-mt-[12.5rem]";

            return (
              <div
                key={q.id}
                ref={(el) => {
                  questionRefs.current[idx] = el;
                }}
                className={marginUnderHeader}
              >
                <article
                  className={`rounded-3xl border bg-white p-5 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.18)] sm:p-8 ${
                    isActive
                      ? ACTIVE_CARD_RING
                      : isPast
                        ? "border-slate-200/80"
                        : "border-slate-200/80"
                  }`}
                >
                  <p className="mb-3 text-[11px] font-semibold tabular-nums tracking-wide text-slate-500 sm:text-xs">
                    Question {idx + 1} of {total}
                    {isActive ? <span className={`ml-2 font-bold ${BRAND_ACCENT_TEXT}`}>· Current</span> : null}
                    {isPast && coerceAnswer(q, raw) !== null ? (
                      <span className="ml-2 font-semibold text-emerald-700">· Answered</span>
                    ) : null}
                  </p>
                  <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">{q.prompt}</h2>

                  <div className="mt-7 max-w-3xl">
                    {q.type === "likert" && (
                      <LikertScaleNumeric
                        scaleMin={q.scaleMin ?? 1}
                        scaleMax={q.scaleMax ?? 5}
                        value={likertVal}
                        onChange={(n) => {
                          setAnswer(q.id, n);
                          if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                        }}
                      />
                    )}
                    {q.type === "single" && (
                      <SingleChoice
                        options={q.options ?? []}
                        value={singleVal}
                        onChange={(v) => {
                          setAnswer(q.id, v);
                          if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                        }}
                      />
                    )}
                    {q.type === "multi" && (
                      <MultiChoiceAdvance
                        options={q.options ?? []}
                        value={multiVal}
                        onAnswersChange={(v) => setAnswer(q.id, v)}
                        onContinue={(selected) => {
                          if (!selected.length) return;
                          if (coerceAnswer(q, selected) === null) return;
                          if (idx === activeIdx) tryRevealNextAfterIndex(idx);
                        }}
                      />
                    )}
                  </div>
                </article>
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
              {canFinish
                ? assessment.id === defaultAssessmentId
                  ? "Next you’ll answer a short wellness context questionnaire — then we’ll run your persona results."
                  : "Tap answered rows below the header if you want to change them; then finish when you're ready."
                : "Some answers still look incomplete."}
            </p>
          </div>
        ) : null}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/75 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className={`${assessmentShellClass} ${assessmentShellPadClass} flex flex-col gap-2`}>
          {submitError ? <p className="text-center text-xs text-red-700">{submitError}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="text-[11px] font-medium text-slate-700">
              {answeredCount}/{total} answered
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitError(null);
                const action = editMode ? handleSaveAndReturn() : handleFinish();
                void action.catch((e: unknown) => {
                  setSubmitError(e instanceof Error ? e.message : "Could not submit. Please try again.");
                });
              }}
              disabled={!canFinish}
              className={`${CTA_PRIMARY_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {editMode
                ? "Save & return to review"
                : assessment.id === defaultAssessmentId
                  ? "Submit and continue"
                  : requirePayment
                    ? "Finish & continue to checkout"
                    : "Finish & unlock results"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Grey teaser for the next unanswered questions (shown below the current card). */
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
        <div className="mt-6 opacity-80">
          <LikertScaleNumeric scaleMin={q.scaleMin ?? 1} scaleMax={q.scaleMax ?? 5} preview readOnly />
        </div>
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

/** Likert: endpoint labels + optional "Neutral" caption above scale point 4 (number stays on button). */
function LikertScaleNumeric({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 5,
  disabled,
  readOnly,
  preview,
}: {
  value?: number;
  onChange?: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
  disabled?: boolean;
  readOnly?: boolean;
  preview?: boolean;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);

  const neutralAbove = (n: number) => n === 4 && n > min && n < max;

  const count = nums.length;

  const colTemplate = `repeat(${count}, minmax(0, 1fr))`;

  const tileBase =
    "flex w-full touch-manipulation select-none flex-col items-center justify-center rounded-xl border px-0.5 py-2.5 text-sm font-bold transition-colors min-h-[2.75rem] min-w-0 sm:min-h-[3.1rem] sm:rounded-2xl sm:text-base";
  const inactive = preview
    ? "border-slate-200 bg-white text-slate-900"
    : "cursor-pointer border-slate-200 bg-white text-slate-900 hover:border-[#2D82FF]/50 hover:cursor-pointer active:scale-[0.98]";
  const active =
    "border-transparent bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-white shadow-md shadow-[#2D82FF]/35";

  return (
    <div className={preview ? "opacity-[0.96]" : ""}>
      {!readOnly && !preview ? (
        <div className="mb-3 flex justify-between gap-2 text-[10px] font-medium leading-tight text-slate-500 sm:mb-4 sm:text-xs">
          <span className="min-w-0 shrink text-left">Strongly Disagree</span>
          <span className="min-w-0 shrink text-right">Strongly Agree</span>
        </div>
      ) : null}

      {/* Captions row: “Neutral” only above scale point 4 */}
      <div className="grid gap-1.5 sm:gap-2.5" style={{ gridTemplateColumns: colTemplate }}>
        {nums.map((n) => (
          <div
            key={`cap-${n}`}
            className="flex min-h-[1rem] flex-col justify-end pb-0.5 text-center sm:min-h-[1.125rem]"
          >
            <span
              className={`text-[9px] font-semibold uppercase leading-none tracking-wide sm:text-[10px] ${
                neutralAbove(n) ? "text-slate-400" : "invisible select-none"
              }`}
              aria-hidden={!neutralAbove(n)}
            >
              Neutral
            </span>
          </div>
        ))}
      </div>

      <div
        className="mt-1 grid gap-1.5 sm:gap-2.5"
        style={{ gridTemplateColumns: colTemplate }}
        role={readOnly ? "presentation" : "group"}
        aria-label={readOnly ? undefined : "Agreement scale"}
      >
        {nums.map((n) => {
          const pressed = value === n;
          return (
            <button
              key={n}
              type="button"
              disabled={disabled || readOnly || preview}
              onClick={() => onChange?.(n)}
              aria-label={neutralAbove(n) ? `Point ${n}, Neutral` : `Point ${n}`}
              aria-pressed={pressed}
              className={`${tileBase} ${pressed ? active : inactive} ${
                disabled || readOnly || preview ? "cursor-default active:scale-100" : ""
              } ${preview && !pressed ? "border-slate-100" : ""}`}
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
  disabled,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-2 lg:gap-2.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`flex w-full min-h-[3rem] cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-[#2D82FF]/50 bg-linear-to-br from-[#00C9C8]/10 to-white text-[#0D1B2A] shadow-inner"
                : "border-slate-200 bg-white text-[#4D4D4D] hover:border-slate-300"
            }`}
          >
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Multi-choice: pick selections then Continue (reveals next question when answered). */
function MultiChoiceAdvance({
  options,
  value,
  disabled,
  onAnswersChange,
  onContinue,
}: {
  options: string[];
  value: string[];
  disabled?: boolean;
  onAnswersChange: (v: string[]) => void;
  onContinue: (selected: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (disabled) return;
    if (value.includes(opt)) onAnswersChange(value.filter((x) => x !== opt));
    else onAnswersChange([...value, opt]);
  };
  const canContinue = value.length > 0;
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt)}
            className={`flex w-full min-h-[3rem] cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-[#2D82FF]/50 bg-[#F7F9FB] text-[#0D1B2A]"
                : "border-slate-200 bg-white text-[#4D4D4D] hover:border-slate-300"
            }`}
          >
            <span>{opt}</span>
            <span className="text-[11px] font-semibold text-slate-500">{active ? "Selected" : "Tap"}</span>
          </button>
        );
      })}
      <p className="text-xs text-slate-500">Select any that apply, then continue.</p>
      <button
        type="button"
        disabled={disabled || !canContinue}
        onClick={() => onContinue(value)}
        className={`mt-3 w-full ${CTA_PRIMARY_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        Continue
      </button>
    </div>
  );
}
