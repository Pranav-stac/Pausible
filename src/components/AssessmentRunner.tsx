"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ADVANCE_DELAY_MS,
  ASSESS_CONTENT_MAX,
  ASSESS_PAD,
  AssessAtmosphere,
  AssessCompleteOverlay,
  AssessGlassHeader,
  AssessIntro,
  AssessProgressBar,
  assessCardStyle,
  cardVisual,
  LikertCircles,
  MultiChoiceStack,
  SCROLL_SETTLE_MS,
  SingleChoiceStack,
} from "@/components/assessment/assess-ui";
import { trackAssessmentComplete, trackAssessmentStart } from "@/lib/analytics/track";
import { WELLNESS_CONTEXT_PREFIX } from "@/data/wellness-context-questionnaire";
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
  /** Active question index — matches pausibl-assessment design mechanics. */
  const [activeIndex, setActiveIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const attemptIdRef = useRef("");
  const claimSecretRef = useRef("");
  const startTrackedRef = useRef<string | null>(null);
  const assessmentSessionIdRef = useRef<string | null>(null);
  const resumeLoadedRef = useRef(false);
  const focusAppliedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clampMaxRef = useRef<number | null>(null);
  const scrollLockedRef = useRef(false);

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
      setActiveIndex(Math.max(0, (saved.revealedCount ?? 1) - 1));
    } else {
      attemptIdRef.current = crypto.randomUUID();
      setAnswers({});
      setActiveIndex(0);
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
        setActiveIndex(Math.max(0, flat.length - 1));
        setComplete(flat.every((q) => coerceAnswer(q, restored[q.id]) !== null));
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
    setActiveIndex(idx);
    setComplete(false);
  }, [focusQuestionId, questions]);

  useEffect(() => {
    if (!assessment?.id || !attemptIdRef.current) return;
    saveOceanProgress({
      attemptId: attemptIdRef.current,
      assessmentId: assessment.id,
      answers,
      revealedCount: activeIndex + 1,
      updatedAt: new Date().toISOString(),
    });
  }, [answers, assessment?.id, activeIndex]);

  const updateClamp = useCallback(
    (index: number) => {
      if (typeof window === "undefined") return;
      let neededForCenter = 0;
      const activeEl = questionRefs.current[index];
      if (activeEl) {
        const r = activeEl.getBoundingClientRect();
        const center = r.top + window.pageYOffset + r.height / 2;
        neededForCenter = Math.max(0, center - window.innerHeight / 2);
      }

      let neededForFaded = 0;
      const lastVisible = Math.min(index + 2, Math.max(total - 1, 0));
      const fadedEl = questionRefs.current[lastVisible];
      if (fadedEl) {
        const rect = fadedEl.getBoundingClientRect();
        const bottom = rect.bottom + window.pageYOffset;
        neededForFaded = Math.max(0, bottom - window.innerHeight + 24);
      }

      clampMaxRef.current = Math.max(neededForCenter, neededForFaded);
    },
    [total],
  );

  const scrollToActive = useCallback(
    (i: number) => {
      if (typeof window === "undefined") return;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      scrollLockedRef.current = true;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      settleTimerRef.current = setTimeout(() => {
        const el = questionRefs.current[i];
        if (el) {
          const rect = el.getBoundingClientRect();
          const cardCenter = rect.top + window.pageYOffset + rect.height / 2;
          const targetTop = Math.max(cardCenter - window.innerHeight / 2, 0);
          clampMaxRef.current = Math.max(clampMaxRef.current || 0, targetTop);
          window.scrollTo({ top: targetTop, behavior: reduceMotion ? "auto" : "smooth" });
        }
        window.setTimeout(() => {
          scrollLockedRef.current = false;
          updateClamp(i);
        }, 500);
      }, SCROLL_SETTLE_MS);
    },
    [updateClamp],
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined" || complete) return;
    scrollToActive(activeIndex);
  }, [activeIndex, complete, scrollToActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      if (clampMaxRef.current == null || scrollLockedRef.current) return;
      if (window.pageYOffset > clampMaxRef.current) {
        window.scrollTo(0, clampMaxRef.current);
      }
    };
    const onResize = () => updateClamp(activeIndex);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [activeIndex, updateClamp]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

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

  const advanceAfterAnswer = useCallback(
    (qi: number) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        if (qi === total - 1) {
          setComplete(true);
        } else {
          const next = qi + 1;
          setActiveIndex(next);
          setComplete(false);
        }
      }, ADVANCE_DELAY_MS);
    },
    [total],
  );

  const onLikertOrSingle = useCallback(
    (qi: number, value: number | string) => {
      const q = questions[qi];
      if (!q) return;
      setAnswer(q.id, value);

      if (qi < activeIndex) return;
      if (qi !== activeIndex) return;
      advanceAfterAnswer(qi);
    },
    [activeIndex, advanceAfterAnswer, questions, setAnswer],
  );

  const fillAllRandomTesting = useCallback(() => {
    if (!questions.length || !assessment || !attemptUid) return;
    const next = randomAnswersForQuestions(questions);
    setAnswers(next);
    setActiveIndex(Math.max(0, questions.length - 1));
    setComplete(true);

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

  const finishLabel = editMode
    ? "Save & return to review"
    : assessment?.id === defaultAssessmentId
      ? "Continue"
      : requirePayment
        ? "Continue to checkout"
        : "See my results";

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

  return (
    <div className="assess-page relative min-h-screen overflow-x-hidden antialiased">
      <AssessGlassHeader>
        <Link href="/" className="shrink-0 rounded-lg outline-offset-4" aria-label="Pausible home">
          <BrandLogo heightClass="h-[34px]" priority />
        </Link>
        <AssessProgressBar
          answeredCount={answeredCount}
          total={total}
          percent={progress}
          trailing={
            <>
              {editMode && returnPath ? (
                <Link
                  href={returnPath}
                  className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white"
                >
                  ← Review
                </Link>
              ) : null}
              {showTestFill ? (
                <button
                  type="button"
                  title="Development / QA only"
                  onClick={fillAllRandomTesting}
                  className="rounded-full border border-dashed border-slate-300 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white"
                >
                  Fill (test)
                </button>
              ) : null}
            </>
          }
        />
      </AssessGlassHeader>

      <AssessAtmosphere />

      <AssessIntro
        badge="Personality assessment"
        title="Answer honestly. There are no right or wrong answers."
        subtitle="Rate how much each statement sounds like you, from 1 (strongly disagree) to 7 (strongly agree)."
      />

      <main className={`relative z-[1] flex flex-col gap-7 pt-14 pb-[60vh] sm:gap-8 ${ASSESS_CONTENT_MAX} ${ASSESS_PAD}`}>
        {questions.map((q, idx) => {
          const distance = idx - activeIndex;
          const absDist = Math.abs(distance);
          const isPrevious = distance < 0;
          const shouldRender = isPrevious || absDist <= 2;
          if (!shouldRender) return null;

          const visual = cardVisual(distance);
          const raw = answers[q.id];
          const likertVal = q.type === "likert" && typeof raw === "number" ? raw : undefined;
          const singleVal = q.type === "single" && typeof raw === "string" ? raw : undefined;
          const multiVal = q.type === "multi" && Array.isArray(raw) ? (raw as string[]) : [];

          return (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[idx] = el;
              }}
              className="assess-card"
              style={assessCardStyle(visual)}
            >
              <div className="mb-3.5 text-xs font-bold tracking-[0.5px]" style={{ color: visual.numberColor }}>
                Question {idx + 1} of {total}
              </div>
              <h2
                className="m-0 mb-[30px] leading-[1.42] font-bold tracking-[-0.01em]"
                style={{ fontSize: visual.textSize, color: visual.textColor }}
              >
                {q.prompt}
              </h2>

              {q.type === "likert" ? (
                <LikertCircles
                  scaleMin={q.scaleMin ?? 1}
                  scaleMax={q.scaleMax ?? 7}
                  value={likertVal}
                  isActive={visual.isActive}
                  disabled={visual.pointerEvents === "none"}
                  onChange={(n) => onLikertOrSingle(idx, n)}
                />
              ) : null}

              {q.type === "single" ? (
                <SingleChoiceStack
                  options={q.options ?? []}
                  value={singleVal}
                  isActive={visual.isActive}
                  disabled={visual.pointerEvents === "none"}
                  onChange={(v) => onLikertOrSingle(idx, v)}
                />
              ) : null}

              {q.type === "multi" ? (
                <MultiChoiceStack
                  options={q.options ?? []}
                  value={multiVal}
                  isActive={visual.isActive}
                  disabled={visual.pointerEvents === "none"}
                  onAnswersChange={(v) => setAnswer(q.id, v)}
                  onContinue={(selected) => {
                    if (!selected.length) return;
                    if (coerceAnswer(q, selected) === null) return;
                    if (idx < activeIndex) return;
                    if (idx !== activeIndex) return;
                    advanceAfterAnswer(idx);
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </main>

      {complete ? (
        <AssessCompleteOverlay
          title="You're all done."
          body={
            assessment.id === defaultAssessmentId
              ? "Next up is a short wellness context questionnaire — then your personalized report."
              : "Your Wellness Intelligence Engine is ready to decode your responses."
          }
          ctaLabel={finishLabel}
          disabled={!canFinish}
          busy={submitting}
          error={submitError}
          hint={!canFinish ? "Some answers still look incomplete — scroll up to review." : null}
          onCta={() => {
            setSubmitError(null);
            setSubmitting(true);
            const action = editMode ? handleSaveAndReturn() : handleFinish();
            void action.catch((e: unknown) => {
              setSubmitting(false);
              setSubmitError(e instanceof Error ? e.message : "Could not submit. Please try again.");
            });
          }}
        />
      ) : null}
    </div>
  );
}
