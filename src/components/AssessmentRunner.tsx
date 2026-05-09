"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

/** Short line for collapsed “answered” rows (shown under header so current question dominates). */
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
  /** Renders question cards 0..revealedCount-1; increments when the latest visible question is answered. */
  const [revealedCount, setRevealedCount] = useState(1);
  /** Full editor for one answered question when user taps its compact row */
  const [expandedPastIndex, setExpandedPastIndex] = useState<number | null>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
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
    attemptIdRef.current = crypto.randomUUID();
    setAnswers({});
    setRevealedCount(1);
    setExpandedPastIndex(null);
  }, [assessment]);

  useEffect(() => {
    setExpandedPastIndex(null);
  }, [revealedCount]);

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

  const tryRevealNextAfterIndex = useCallback((answeredIndex: number) => {
    setRevealedCount((r) => (answeredIndex === r - 1 && r < total ? r + 1 : r));
  }, [total]);

  const scrollToQuestion = useCallback((index: number) => {
    const el = questionRefs.current[index];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPreviousBlock = useCallback(() => {
    if (revealedCount < 2) return;
    scrollToQuestion(Math.max(0, revealedCount - 2));
  }, [revealedCount, scrollToQuestion]);

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
    setRevealedCount(questions.length);
  }, [assessment, questions]);

  const showTestFill = assessmentTestToolsAllowed();

  const canFinish = useMemo(() => {
    if (!questions.length) return false;
    return questions.every((q) => coerceAnswer(q, answers[q.id]) !== null);
  }, [questions, answers]);

  const canScrollPrev = revealedCount >= 2;

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
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-sky-50/90 pb-[10rem] sm:pb-44">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-3 py-3 sm:max-w-xl sm:px-4 lg:max-w-[40rem]">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-linear-to-r from-sky-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">{progress}%</span>
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

      <main className="relative z-10 mx-auto w-full max-w-lg px-3 py-8 sm:max-w-xl sm:px-5 sm:py-10 lg:max-w-[40rem]">
        <div className="flex flex-col gap-3 sm:gap-4">
          {questions.slice(0, revealedCount).map((q, idx) => {
            const raw = answers[q.id];
            const likertVal = q.type === "likert" && typeof raw === "number" ? raw : undefined;
            const singleVal = q.type === "single" && typeof raw === "string" ? raw : undefined;
            const multiVal = q.type === "multi" && Array.isArray(raw) ? (raw as string[]) : [];
            const activeIdx = revealedCount - 1;
            const isActive = idx === activeIdx;
            const isPast = idx < activeIdx;
            const pastAnswered = isPast && coerceAnswer(q, raw) !== null;
            const marginUnderHeader =
              "scroll-mt-[10.75rem] sm:scroll-mt-[12.5rem]";
            const snippet = summarizeAnswerSnippet(q, raw);

            if (pastAnswered && expandedPastIndex !== idx) {
              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionRefs.current[idx] = el;
                  }}
                  className={marginUnderHeader}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 rounded-2xl border border-slate-200/95 bg-white/95 px-4 py-3 text-left shadow-sm ring-1 ring-slate-100/85 transition-colors hover:border-sky-300/70 hover:bg-white active:bg-sky-50/40 sm:rounded-3xl sm:py-3.5"
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
                      <p className="mt-2 text-[11px] font-semibold text-sky-700">Tap to change answer</p>
                    </span>
                  </button>
                </div>
              );
            }

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
                      ? "border-sky-300/80 ring-2 ring-sky-400/45 ring-offset-2 ring-offset-slate-50"
                      : "border-slate-200/80"
                  }`}
                >
                  {isPast && expandedPastIndex === idx ? (
                    <div className="-mt-1 mb-4 flex justify-end">
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-indigo-800"
                        onClick={() => setExpandedPastIndex(null)}
                      >
                        Collapse summary
                      </button>
                    </div>
                  ) : null}
                  <p className="mb-3 text-[11px] font-semibold tabular-nums tracking-wide text-slate-500 sm:text-xs">
                    Question {idx + 1} of {total}
                    {isActive ? <span className="ml-2 font-bold text-sky-700">· Current</span> : null}
                  </p>
                  <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-950 sm:text-xl">{q.prompt}</h2>

                  {q.type === "likert" && q.reverse ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-amber-900/90">
                      <span className="font-semibold">Note:</span> Reverse-worded—your choice is scored automatically;
                      answer for how you actually behave.
                    </p>
                  ) : null}

                  <div className="mt-7">
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
                ? "Tap answered rows below the header if you want to change them; then finish when you're ready."
                : "Some answers still look incomplete."}
            </p>
          </div>
        ) : null}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/75 bg-white/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_36px_-24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-end gap-3 sm:max-w-xl lg:max-w-[40rem]">
          <p className="text-[11px] font-medium text-slate-700">{answeredCount}/{total} answered</p>
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
