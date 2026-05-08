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
  /** Server snapshot when Admin SDK is configured; `null` falls back to client Firestore. */
  bootstrapAssessment: AssessmentDefinition | null;
  /** Require-payment from server; `null` loads via client. */
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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string | string[]>>({});
  const startTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assessment?.id || !effectiveUid) return;
    if (startTrackedRef.current === assessment.id) return;
    startTrackedRef.current = assessment.id;
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    void trackAssessmentStart({ uid: effectiveUid, assessmentId: assessment.id, path });
  }, [assessment, effectiveUid]);

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
  const current = questions[step];
  const progress = total ? Math.round(((step + (current ? 1 : 0)) / total) * 100) : 0;

  function deriveSectionProgress() {
    if (!assessment || !current) return null;
    const numSections = assessment.sections.length;
    for (let si = 0; si < assessment.sections.length; si++) {
      const sec = assessment.sections[si];
      const idx = sec.questionIds.indexOf(current.id);
      if (idx >= 0) {
        return {
          title: sec.title,
          sectionIndex: si + 1,
          sectionTotal: numSections,
          questionInSection: idx + 1,
          questionsInSection: sec.questionIds.length,
        };
      }
    }
    return {
      title: "Assessment",
      sectionIndex: 1,
      sectionTotal: Math.max(1, numSections),
      questionInSection: step + 1,
      questionsInSection: total,
    };
  }
  const sectionProgress = deriveSectionProgress();

  const setAnswer = useCallback(
    (qid: string, value: number | string | string[]) => {
      setAnswers((prev) => ({ ...prev, [qid]: value }));
    },
    [setAnswers],
  );

  const handleNext = useCallback(async () => {
    if (!assessment || !current || !effectiveUid) return;
    const coerced = coerceAnswer(current, answers[current.id]);
    if (coerced === null) return;

    const merged = { ...answers, [current.id]: coerced };

    if (step < total - 1) {
      setAnswers(merged);
      setStep((s) => s + 1);
      return;
    }

    const scores = computeScores(assessment, merged);
    const id = crypto.randomUUID();
    await upsertAttempt({
      id,
      uid: effectiveUid,
      assessmentId: assessment.id,
      answers: merged,
      scores,
      paymentStatus: "pending",
      shareToken: null,
      isLatestShareEligible: false,
    });

    const pvPath = typeof window !== "undefined" ? window.location.pathname : "/";
    await trackAssessmentComplete({
      uid: effectiveUid,
      assessmentId: assessment.id,
      path: pvPath,
      requirePayment,
    });

    if (!requirePayment) {
      const token = randomShareToken();
      await finalizeAttemptPayment({
        uid: effectiveUid,
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
  }, [answers, assessment, current, effectiveUid, requirePayment, router, step, total]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const fillAllRandomTesting = useCallback(() => {
    if (!questions.length || !assessment) return;
    const next = randomAnswersForQuestions(questions);
    setAnswers(next);
    const last = Math.max(0, questions.length - 1);
    setStep(last);
  }, [assessment, questions]);

  const showTestFill = assessmentTestToolsAllowed();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Preparing your session…
      </div>
    );
  }

  if (!effectiveUid) {
    return (
      <div className="mx-auto max-w-lg px-1.5 py-16 text-center text-sm text-slate-600 sm:px-2">
        Unable to start a session. Try disabling strict tracking protection for this site, or add valid Firebase env keys
        and enable Anonymous sign-in in the Firebase console.
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

  if (!assessment || !current) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading assessment…
      </div>
    );
  }

  const coerced = coerceAnswer(current, answers[current.id]);
  const canAdvance = coerced !== null;

  const currentAnswer = answers[current.id];
  const likertValue = typeof currentAnswer === "number" ? currentAnswer : undefined;
  const singleValue = typeof currentAnswer === "string" ? currentAnswer : undefined;
  const multiValue = Array.isArray(currentAnswer) ? currentAnswer : [];

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-1.5 py-3 sm:px-2 sm:py-4">
          <Link href="/" className="flex items-center rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-[1.05rem]" />
          </Link>
          {showTestFill ? (
            <button
              type="button"
              title="Development / QA only"
              onClick={fillAllRandomTesting}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-900 shadow-sm hover:bg-violet-100 sm:text-xs"
            >
              Fill all randomly (test)
            </button>
          ) : null}
          <div className="flex min-w-[140px] flex-1 basis-[200px] items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-linear-to-r from-sky-500 to-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-slate-500">{progress}%</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-1.5 py-10 sm:px-2">
        {sectionProgress ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-950 ring-1 ring-sky-200/80">
              Section {sectionProgress.sectionIndex}/{sectionProgress.sectionTotal}:{" "}
              <span className="font-semibold">{sectionProgress.title}</span>
            </p>
            <p className="text-xs font-medium text-slate-500">
              In this section: {sectionProgress.questionInSection} / {sectionProgress.questionsInSection}
            </p>
          </div>
        ) : null}
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Overall {step + 1} / {total}
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">{current.prompt}</h1>
        {current.caption ? <p className="mt-2 text-xs font-semibold tracking-wide text-slate-500">{current.caption}</p> : null}
        {current.type === "likert" && current.reverse ? (
          <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
            <p className="font-semibold text-amber-950">Reverse-worded statement</p>
            <p className="mt-1 text-amber-900/95">
              The text is flipped (for example agrees with avoidance). Behind the scenes we invert your numeric choice so “high trait” means the same thing as positively worded items. Pick the number that best matches you—don’t manually “undo” anything.
            </p>
          </div>
        ) : null}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {current.type === "likert" && (
            <LikertScale
              scaleMin={current.scaleMin ?? 1}
              scaleMax={current.scaleMax ?? 5}
              value={likertValue}
              onChange={(n) => setAnswer(current.id, n)}
            />
          )}
          {current.type === "single" && (
            <SingleChoice
              options={current.options ?? []}
              value={singleValue}
              onChange={(v) => setAnswer(current.id, v)}
            />
          )}
          {current.type === "multi" && (
            <MultiChoice
              options={current.options ?? []}
              value={multiValue}
              onChange={(v) => setAnswer(current.id, v)}
            />
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={!canAdvance}
            className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-40"
          >
            {step < total - 1 ? "Continue" : requirePayment ? "Finish & continue to checkout" : "Finish & unlock results"}
          </button>
        </div>
      </main>
    </div>
  );
}

function LikertScale({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 5,
}: {
  value?: number;
  onChange: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums = [];
  for (let n = min; n <= max; n++) nums.push(n);

  const hueFor = (n: number) => {
    if (max === min) return 210;
    const t = (n - min) / (max - min);
    return 196 + t * 130;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {nums.map((n) => {
          const active = value === n;
          const h = hueFor(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={
                active
                  ? {
                      borderColor: `hsl(${h}deg 73% 40%)`,
                      backgroundColor: `hsl(${h}deg 78% ${Math.max(86, 96 - ((n - min) / Math.max(1, max - min)) * 10)}%)`,
                      color: `hsl(${h}deg 40% 18%)`,
                      boxShadow: `0 10px 24px hsl(${h}deg 62% 40% / 0.28)`,
                    }
                  : undefined
              }
              className={`min-w-[46px] rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:min-w-[52px] sm:px-4 ${
                active ? "ring-2 ring-black/10" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Tap <strong>{min}</strong> for strong disagreement → <strong>{max}</strong> for strong agreement. Each value uses
        its own tone when selected.
      </p>
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
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-indigo-500 bg-indigo-50 text-slate-900"
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

function MultiChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? "border-emerald-500 bg-emerald-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            <span>{opt}</span>
            <span className="text-xs font-semibold text-slate-500">{active ? "Selected" : "Tap"}</span>
          </button>
        );
      })}
      <p className="text-xs text-slate-500">Select any that apply.</p>
    </div>
  );
}
