"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CTA_PRIMARY_CLASS } from "@/components/marketing/marketing-brand";
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
const ADVANCE_DELAY_MS = 420;
const SCROLL_SETTLE_MS = 460;

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

type CardVisual = {
  opacity: number;
  scale: number;
  blur: string;
  pointerEvents: "auto" | "none";
  shadow: string;
  padding: string;
  radius: string;
  textSize: string;
  background: string;
  border: string;
  textColor: string;
  numberColor: string;
  isActive: boolean;
  isPrevious: boolean;
};

function cardVisual(distance: number): CardVisual {
  const absDist = Math.abs(distance);
  const isActive = distance === 0;
  const isPrevious = distance < 0;

  if (isActive) {
    return {
      opacity: 1,
      scale: 1,
      blur: "none",
      pointerEvents: "auto",
      shadow: "0 30px 66px -30px rgba(2,132,199,.22)",
      padding: "clamp(30px,5vw,46px)",
      radius: "26px",
      textSize: "clamp(19px,2.6vw,23px)",
      background: "#0C2340",
      border: "1.5px solid rgba(255,255,255,.08)",
      textColor: "#ffffff",
      numberColor: "rgba(255,255,255,.6)",
      isActive: true,
      isPrevious: false,
    };
  }

  if (isPrevious) {
    return {
      opacity: 1,
      scale: absDist === 1 ? 0.98 : 0.96,
      blur: "none",
      pointerEvents: "auto",
      shadow: "0 10px 26px -20px rgba(17,24,39,.14)",
      padding: "clamp(22px,4vw,28px)",
      radius: "20px",
      textSize: "17px",
      background: "#fff",
      border: absDist === 1 ? "1.5px solid #E3F3F4" : "1px solid #EEF0F3",
      textColor: "#1F2430",
      numberColor: "#B7BCC6",
      isActive: false,
      isPrevious: true,
    };
  }

  if (absDist === 1) {
    return {
      opacity: 0.4,
      scale: 0.95,
      blur: "blur(1px)",
      pointerEvents: "none",
      shadow: "0 16px 40px -28px rgba(17,24,39,.16)",
      padding: "clamp(22px,4vw,30px)",
      radius: "22px",
      textSize: "17px",
      background: "#fff",
      border: "1px solid #F1F2F4",
      textColor: "#1F2430",
      numberColor: "#B7BCC6",
      isActive: false,
      isPrevious: false,
    };
  }

  return {
    opacity: 0.18,
    scale: 0.91,
    blur: "blur(1.5px)",
    pointerEvents: "none",
    shadow: "none",
    padding: "20px 24px",
    radius: "20px",
    textSize: "16px",
    background: "#fff",
    border: "1px solid #F1F2F4",
    textColor: "#1F2430",
    numberColor: "#B7BCC6",
    isActive: false,
    isPrevious: false,
  };
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
      <header className="pointer-events-none fixed top-0 right-0 left-0 z-50 px-4 py-3.5 sm:px-5">
        <div className="pointer-events-auto mx-auto flex max-w-[760px] items-center gap-4 rounded-[18px] border border-white/70 bg-white/72 px-[18px] py-3 shadow-[0_4px_28px_-6px_rgba(17,24,39,0.1),inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-[22px] backdrop-saturate-200 sm:gap-5 sm:px-[22px]">
          <Link href="/" className="shrink-0 rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-[34px]" priority />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-[#6B7280]">
                <span className="font-bold text-[#1F2430]">{answeredCount}</span> of {total} answered
              </span>
              <div className="flex items-center gap-2">
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
                <span className="shrink-0 text-xs font-bold whitespace-nowrap text-[var(--assess-accent)]">
                  {progress}%
                </span>
              </div>
            </div>
            <div className="h-1.5 overflow-hidden rounded-md bg-[#EDEFF2]">
              <div
                className="h-full rounded-md transition-[width] duration-[600ms] ease-[cubic-bezier(.4,0,.2,1)]"
                style={{ width: `${progress}%`, background: "var(--assess-grad)" }}
              />
            </div>
          </div>
        </div>
      </header>

      <div
        aria-hidden
        className="assess-orb pointer-events-none fixed top-[-140px] right-[-100px] z-0 h-[420px] w-[420px] rounded-full opacity-10 blur-[100px]"
        style={{ background: "var(--assess-grad)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-[-160px] left-[-120px] z-0 h-[440px] w-[440px] rounded-full opacity-[0.07] blur-[110px]"
        style={{ background: "var(--assess-grad)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[38%] left-[-70px] z-0 h-[70px] w-[70px] rounded-[42%_58%_56%_44%/48%_42%_58%_52%] border-2 border-[#E3E7ED] opacity-50"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-[20%] right-[6%] z-0 h-11 w-11 rounded-full border-2 border-[#E3E7ED] opacity-50"
      />

      <div className="relative z-[1] mx-auto max-w-[640px] px-6 pt-[150px] pb-1 text-center">
        <div
          className="mb-[22px] inline-flex items-center gap-2.5 rounded-full px-4 py-[7px] text-[13px] font-semibold text-[var(--assess-accent)]"
          style={{ background: "var(--assess-grad-soft)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--assess-accent)]" />
          Personality assessment
        </div>
        <h1 className="m-0 mb-3 text-[clamp(24px,3.4vw,32px)] leading-[1.25] font-bold tracking-[-0.015em]">
          Answer honestly. There are no right or wrong answers.
        </h1>
        <p className="m-0 mb-2 text-[15.5px] text-[#6B7280]">
          Rate how much each statement sounds like you, from 1 (strongly disagree) to 7 (strongly agree).
        </p>
      </div>

      <main className="relative z-[1] mx-auto flex max-w-[640px] flex-col gap-[26px] px-6 pt-14 pb-[60vh]">
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
              style={{
                background: visual.background,
                borderRadius: visual.radius,
                border: visual.border,
                boxShadow: visual.shadow,
                padding: visual.padding,
                opacity: visual.opacity,
                transform: `scale(${visual.scale})`,
                filter: visual.blur,
                pointerEvents: visual.pointerEvents,
              }}
            >
              <div
                className="mb-3.5 text-xs font-bold tracking-[0.5px]"
                style={{ color: visual.numberColor }}
              >
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(250,251,252,0.97)] p-6 backdrop-blur-[6px]">
          <div className="w-full max-w-[460px] text-center">
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
              <span
                aria-hidden
                className="assess-ripple absolute inset-0 rounded-full opacity-35"
                style={{ background: "var(--assess-grad)" }}
              />
              <span
                aria-hidden
                className="assess-ripple absolute inset-0 rounded-full opacity-35 [animation-delay:0.5s]"
                style={{ background: "var(--assess-grad)" }}
              />
              <span
                aria-hidden
                className="assess-ripple absolute inset-0 rounded-full opacity-35 [animation-delay:1s]"
                style={{ background: "var(--assess-grad)" }}
              />
              <div
                className="assess-complete-pop relative flex h-[88px] w-[88px] items-center justify-center rounded-full shadow-[0_20px_44px_-16px_rgba(2,132,199,0.55)]"
                style={{ background: "var(--assess-grad)" }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    className="assess-check-path"
                    d="M5 13l4 4L19 7"
                    stroke="#fff"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <h2 className="m-0 mb-3.5 text-[clamp(26px,3.6vw,34px)] font-bold tracking-[-0.02em]">
              You&apos;re all done.
            </h2>
            <p className="m-0 mb-9 text-[17px] leading-[1.6] text-[#4B5563]">
              {assessment.id === defaultAssessmentId
                ? "Next up is a short wellness context questionnaire — then your personalized report."
                : "Your Wellness Intelligence Engine is ready to decode your responses."}
            </p>

            {submitError ? <p className="mb-4 text-sm text-red-600">{submitError}</p> : null}

            <button
              type="button"
              disabled={!canFinish || submitting}
              onClick={() => {
                setSubmitError(null);
                setSubmitting(true);
                const action = editMode ? handleSaveAndReturn() : handleFinish();
                void action.catch((e: unknown) => {
                  setSubmitting(false);
                  setSubmitError(e instanceof Error ? e.message : "Could not submit. Please try again.");
                });
              }}
              className={`${CTA_PRIMARY_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {submitting ? "Saving…" : finishLabel}
              {!submitting ? <span aria-hidden>→</span> : null}
            </button>

            {!canFinish ? (
              <p className="mt-4 text-sm text-amber-700">Some answers still look incomplete — scroll up to review.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LikertCircles({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 7,
  isActive,
  disabled,
}: {
  value?: number;
  onChange?: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
  isActive: boolean;
  disabled?: boolean;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);
  const mid = Math.round((min + max) / 2);

  return (
    <div className="flex items-start gap-1.5" role="group" aria-label="Agreement scale">
      {nums.map((n) => {
        const selected = value === n;
        let label = "";
        if (n === min) label = "Strongly disagree";
        else if (n === mid) label = "Neutral";
        else if (n === max) label = "Strongly agree";

        const badgeBg = selected
          ? "linear-gradient(120deg,#00BFA5,#3B82F6)"
          : isActive
            ? "rgba(255,255,255,.08)"
            : "#F3F4F6";
        const badgeColor = selected ? "#fff" : isActive ? "rgba(255,255,255,.65)" : "#9CA3AF";
        const badgeBorder = selected
          ? "none"
          : isActive
            ? "1px solid rgba(255,255,255,.18)"
            : "1px solid #E5E7EB";
        const labelColor = isActive ? "rgba(255,255,255,.55)" : "#9CA3AF";

        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            aria-label={label ? `Point ${n}, ${label}` : `Point ${n}`}
            aria-pressed={selected}
            className="flex flex-1 cursor-pointer flex-col items-center gap-2 border-0 bg-transparent p-0 pt-1 disabled:cursor-default"
          >
            <span
              className="flex aspect-square min-h-10 w-full max-w-[46px] items-center justify-center rounded-full text-[15px] font-bold transition-all duration-150"
              style={{ background: badgeBg, color: badgeColor, border: badgeBorder }}
            >
              {n}
            </span>
            <span
              className="min-h-[26px] text-center text-[10.5px] leading-[1.3] font-semibold"
              style={{ color: labelColor }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SingleChoiceStack({
  options,
  value,
  onChange,
  isActive,
  disabled,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
  isActive: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className="flex min-h-12 w-full cursor-pointer items-center rounded-2xl border px-4 py-3 text-left text-sm transition disabled:cursor-default"
            style={
              active
                ? {
                    border: "none",
                    background: "linear-gradient(120deg,#00BFA5,#3B82F6)",
                    color: "#fff",
                  }
                : isActive
                  ? {
                      border: "1px solid rgba(255,255,255,.18)",
                      background: "rgba(255,255,255,.08)",
                      color: "rgba(255,255,255,.85)",
                    }
                  : {
                      border: "1px solid #E5E7EB",
                      background: "#fff",
                      color: "#4D4D4D",
                    }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceStack({
  options,
  value,
  disabled,
  isActive,
  onAnswersChange,
  onContinue,
}: {
  options: string[];
  value: string[];
  disabled?: boolean;
  isActive: boolean;
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
            className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition disabled:cursor-default"
            style={
              active
                ? isActive
                  ? {
                      border: "1px solid rgba(255,255,255,.28)",
                      background: "rgba(255,255,255,.12)",
                      color: "#fff",
                    }
                  : {
                      border: "1px solid #BFDBFE",
                      background: "#F0F9FF",
                      color: "#0D1B2A",
                    }
                : isActive
                  ? {
                      border: "1px solid rgba(255,255,255,.18)",
                      background: "rgba(255,255,255,.06)",
                      color: "rgba(255,255,255,.8)",
                    }
                  : {
                      border: "1px solid #E5E7EB",
                      background: "#fff",
                      color: "#4D4D4D",
                    }
            }
          >
            <span>{opt}</span>
            <span className="text-[11px] font-semibold opacity-70">{active ? "Selected" : "Tap"}</span>
          </button>
        );
      })}
      {isActive ? (
        <>
          <p className="text-xs" style={{ color: "rgba(255,255,255,.55)" }}>
            Select any that apply, then continue.
          </p>
          <button
            type="button"
            disabled={disabled || !canContinue}
            onClick={() => onContinue(value)}
            className={`${CTA_PRIMARY_CLASS} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Continue
          </button>
        </>
      ) : null}
    </div>
  );
}
