"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { trackAssessmentComplete, trackAssessmentStart } from "@/lib/analytics/track";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, upsertAttempt, finalizeAttemptPayment } from "@/lib/data/attempt-service";
import { publishShareSnapshot } from "@/lib/data/share-service";
import { randomShareToken } from "@/lib/share-token";
import type { AssessmentDefinition, AssessmentQuestion } from "@/types/models";
import { coerceAnswer, computeScores } from "@/lib/scoring/engine";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { defaultAssessmentId } from "@/data/default-assessment";
import { assessmentTestToolsAllowed, randomAnswersForQuestions } from "@/lib/testing/random-assessment-fill";
import { getOrCreateLocalUid } from "@/lib/local/uid";

const DEBOUNCE_SAVE_MS = 400;
/** Fade current card before promoting the next into the same slot */
const CARD_FADE_OUT_MS = 300;

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
  const { effectiveUid, ready } = useFirebaseAuth();
  const serverPaymentHint = typeof bootstrapRequirePayment === "boolean" ? bootstrapRequirePayment : undefined;
  const { requirePayment } = useAppSettings(serverPaymentHint);
  const [assessment, setAssessment] = useState<AssessmentDefinition | null>(() =>
    bootstrapAssessment != null ? bootstrapAssessment : null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string | string[]>>({});
  const [localUid, setLocalUid] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  type Phase = "show" | "hiding";
  const [phase, setPhase] = useState<Phase>("show");
  const hideTimeoutRef = useRef<number | null>(null);
  const attemptIdRef = useRef("");
  const startTrackedRef = useRef<string | null>(null);
  const assessmentSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalUid(getOrCreateLocalUid());
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
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    attemptIdRef.current = crypto.randomUUID();
    setAnswers({});
    setActiveIndex(0);
    setPhase("show");
  }, [assessment]);

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

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const questions = useMemo(() => (assessment ? flattenQuestions(assessment) : []), [assessment]);
  const total = questions.length;

  const answeredCount = useMemo(() => {
    return questions.reduce((n, q) => n + (coerceAnswer(q, answers[q.id]) !== null ? 1 : 0), 0);
  }, [questions, answers]);

  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  const setAnswer = useCallback((qid: string, value: number | string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const beginAdvanceAfterAnswer = useCallback(() => {
    if (phase === "hiding") return;
    setPhase("hiding");
    if (hideTimeoutRef.current !== null) window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => {
      hideTimeoutRef.current = null;
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(total, 0)));
      setPhase("show");
    }, CARD_FADE_OUT_MS);
  }, [phase, total]);

  useEffect(() => {
    if (!assessment || !attemptUid || !attemptIdRef.current) return;
    if (Object.keys(answers).length === 0) return;

    const id = attemptIdRef.current;
    const t = window.setTimeout(() => {
      void upsertAttempt({
        id,
        uid: attemptUid,
        assessmentId: assessment.id,
        answers: { ...answers },
        scores: null,
        paymentStatus: "pending",
        shareToken: null,
        isLatestShareEligible: false,
      });
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

    const id = attemptIdRef.current;
    const scores = computeScores(assessment, merged);

    await upsertAttempt({
      id,
      uid: attemptUid,
      assessmentId: assessment.id,
      answers: merged,
      scores,
      paymentStatus: "pending",
      shareToken: null,
      isLatestShareEligible: false,
    });

    const pvPath = typeof window !== "undefined" ? window.location.pathname : "/";
    await trackAssessmentComplete({
      uid: attemptUid,
      assessmentId: assessment.id,
      path: pvPath,
      requirePayment,
    });

    if (!requirePayment) {
      const token = randomShareToken();
      await finalizeAttemptPayment({
        uid: attemptUid,
        attemptId: id,
        shareToken: token,
        paymentProvider: "free",
        paymentId: "free-mode",
      });
      const paidRow = await fetchAttempt(id);
      if (paidRow) await publishShareSnapshot(assessment, paidRow, token);
      router.push(`/results/${encodeURIComponent(id)}`);
      return;
    }

    router.push(`/checkout?attemptId=${encodeURIComponent(id)}`);
  }, [answers, assessment, attemptUid, questions, requirePayment, router]);

  const fillAllRandomTesting = useCallback(() => {
    if (!questions.length || !assessment) return;
    const next = randomAnswersForQuestions(questions);
    setAnswers(next);
    setActiveIndex(questions.length);
    setPhase("show");
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, [assessment, questions]);

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

  const currentQuestion = activeIndex < total ? questions[activeIndex] : null;
  const previewSlice = [];
  if (currentQuestion) {
    for (let k = 1; k <= 2; k++) {
      const j = activeIndex + k;
      if (j < total) previewSlice.push(questions[j]);
    }
  }

  const currentAnswerRaw = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentLikertValue =
    currentQuestion?.type === "likert" && typeof currentAnswerRaw === "number" ? currentAnswerRaw : undefined;
  const currentSingleValue =
    currentQuestion?.type === "single" && typeof currentAnswerRaw === "string" ? currentAnswerRaw : undefined;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-sky-50/90 pb-40">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 px-3 py-3 sm:max-w-xl sm:px-4 lg:max-w-[40rem]">
          <Link href="/" className="flex items-center rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-[1.05rem]" />
          </Link>
          {showTestFill ? (
            <button
              type="button"
              title="Development / QA only"
              onClick={fillAllRandomTesting}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:text-xs"
            >
              Fill all randomly (test)
            </button>
          ) : null}
          <div className="flex min-w-[120px] flex-1 basis-[180px] items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-linear-to-r from-sky-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-slate-700">{progress}%</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-lg px-3 py-10 sm:max-w-xl sm:px-5 lg:max-w-[40rem]">
        {activeIndex < total && currentQuestion ? (
          <div
            key={currentQuestion.id}
            className={`transition-all duration-300 ease-out motion-reduce:transition-none ${
              phase === "hiding" ? "pointer-events-none opacity-0 -translate-y-2 scale-[0.985]" : "opacity-100"
            } ${phase === "show" ? "motion-reduce:!animate-none motion-safe:pausable-assessment-card-in" : ""}`}
          >
            <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.18)] sm:p-8">
              <p className="mb-3 text-[11px] font-semibold tabular-nums tracking-wide text-slate-500 sm:text-xs">
                Question {activeIndex + 1} of {total}
              </p>
              <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">
                {currentQuestion.prompt}
              </h2>

              {currentQuestion.type === "likert" && currentQuestion.reverse ? (
                <p className="mt-3 text-[11px] leading-relaxed text-amber-900/90">
                  <span className="font-semibold">Note:</span> Reverse-worded—your choice is scored automatically;
                  answer for how you actually behave.
                </p>
              ) : null}

              <div className="mt-7">
                {currentQuestion.type === "likert" && (
                  <LikertScaleNumeric
                    scaleMin={currentQuestion.scaleMin ?? 1}
                    scaleMax={currentQuestion.scaleMax ?? 5}
                    value={currentLikertValue}
                    onChange={(n) => {
                      if (phase === "hiding") return;
                      setAnswer(currentQuestion.id, n);
                      beginAdvanceAfterAnswer();
                    }}
                    disabled={phase === "hiding"}
                  />
                )}
                {currentQuestion.type === "single" && (
                  <SingleChoice
                    options={currentQuestion.options ?? []}
                    value={currentSingleValue}
                    onChange={(v) => {
                      if (phase === "hiding") return;
                      setAnswer(currentQuestion.id, v);
                      beginAdvanceAfterAnswer();
                    }}
                    disabled={phase === "hiding"}
                  />
                )}
                {currentQuestion.type === "multi" && (
                  <MultiChoiceAdvance
                    options={currentQuestion.options ?? []}
                    value={
                      Array.isArray(answers[currentQuestion.id]) ? (answers[currentQuestion.id] as string[]) : []
                    }
                    disabled={phase === "hiding"}
                    onAnswersChange={(v) => setAnswer(currentQuestion.id, v)}
                    onContinue={(selected) => {
                      if (phase === "hiding" || !selected.length) return;
                      const c = coerceAnswer(currentQuestion, selected);
                      if (c === null) return;
                      beginAdvanceAfterAnswer();
                    }}
                  />
                )}
              </div>
            </article>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_18px_48px_-32px_rgba(15,23,42,0.14)]">
            <p className="text-lg font-semibold text-slate-900">You&apos;ve answered everything</p>
            <p className="mt-2 text-sm text-slate-600">
              {canFinish ? "Tap finish below to see your outcome." : "Some answers still look incomplete."}
            </p>
          </div>
        )}

        <div className="mt-7 space-y-5">
          {previewSlice.map((q) => {
            const pv = coerceAnswer(q, answers[q.id]);
            const qNum = questions.findIndex((x) => x.id === q.id) + 1;
            return (
              <div
                key={q.id}
                className="pointer-events-none select-none rounded-3xl border border-slate-200/85 bg-white/95 p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.1)] saturate-[0.97] sm:p-7"
                aria-hidden
              >
                <p className="mb-2 text-[10px] font-semibold tabular-nums uppercase tracking-wide text-slate-500 sm:text-[11px]">
                  Question {qNum} of {total}
                </p>
                <h3 className="text-sm font-semibold leading-snug text-slate-800 sm:text-base">{q.prompt}</h3>
                <div className="pointer-events-none mt-6">
                  {q.type === "likert" && (
                    <LikertScaleNumeric
                      scaleMin={q.scaleMin ?? 1}
                      scaleMax={q.scaleMax ?? 5}
                      value={typeof pv === "number" ? pv : undefined}
                      preview
                      readOnly
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/75 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 sm:max-w-xl lg:max-w-[40rem]">
          <p className="text-[11px] font-medium text-slate-700">
            {answeredCount}/{total} answered
          </p>
          <button
            type="button"
            onClick={() => void handleFinish()}
            disabled={!canFinish}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 disabled:opacity-40"
          >
            {requirePayment ? "Finish & continue to checkout" : "Finish & unlock results"}
          </button>
        </div>
      </footer>
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
    : "cursor-pointer border-slate-200 bg-white text-slate-900 hover:border-sky-400/70 active:scale-[0.98]";
  const active =
    "border-transparent bg-linear-to-br from-emerald-500 to-sky-500 text-white shadow-md shadow-teal-500/35";

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
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`flex w-full min-h-[3rem] items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-violet-500 bg-linear-to-br from-violet-50 to-white text-slate-900 shadow-inner"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Multi-choice: pick then Continue (card still advances like likert/single). */
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
            className={`flex w-full min-h-[3rem] items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-fuchsia-500 bg-fuchsia-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
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
        className="mt-3 w-full rounded-2xl bg-slate-950 py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
