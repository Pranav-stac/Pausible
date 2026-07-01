"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { NavAuthActions } from "@/components/NavAuthActions";
import { defaultAssessmentId, getDefaultAssessment } from "@/data/default-assessment";
import { getWellnessContextQuestionnaire } from "@/data/wellness-context-questionnaire";
import { trackAssessmentComplete } from "@/lib/analytics/track";
import { PARTICIPANT_DISPLAY_NAME_KEY } from "@/lib/assessment/session-recovery";
import { claimStorageKey, SESSION_ATTEMPT_CLAIM_KEY } from "@/lib/data/attempt-claim-client";
import { upsertAttempt } from "@/lib/data/attempt-service";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import { getOrCreateLocalUid } from "@/lib/local/uid";
import { PROFILE_AGE_OPTIONS, PROFILE_GENDER_OPTIONS } from "@/lib/profile/demographics-options";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import { coerceAnswer, normalizeAnswersForQuestionnaire } from "@/lib/scoring/engine";
import { randomAnswersForQuestions } from "@/lib/testing/random-assessment-fill";
import { testRouteAllowed } from "@/lib/testing/test-route";
import type { AssessmentDefinition, AssessmentQuestion, AttemptAnswers } from "@/types/models";

const WELLNESS_PROFILE_SKIP = new Set(["wc_age_range", "wc_gender"]);

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

function TestLikert({
  q,
  value,
  onChange,
}: {
  q: AssessmentQuestion;
  value?: number;
  onChange: (n: number) => void;
}) {
  const min = q.scaleMin ?? 1;
  const max = q.scaleMax ?? 5;
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);

  return (
    <div>
      {q.scaleMinLabel || q.scaleMaxLabel ? (
        <div className="mb-2 flex justify-between gap-2 text-[10px] text-slate-500">
          <span>{q.scaleMinLabel ? `${min} = ${q.scaleMinLabel}` : ""}</span>
          <span>{q.scaleMaxLabel ? `${max} = ${q.scaleMaxLabel}` : ""}</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            data-testid={`likert-${q.id}-${n}`}
            onClick={() => onChange(n)}
            className={`min-h-9 min-w-9 rounded-lg border px-2 text-sm font-bold tabular-nums ${
              value === n
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-200 bg-white text-slate-800 hover:border-sky-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function TestSingle({
  q,
  value,
  onChange,
}: {
  q: AssessmentQuestion;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {(q.options ?? []).map((opt) => (
        <button
          key={opt}
          type="button"
          data-testid={`single-${q.id}-${opt.replace(/\s+/g, "-").toLowerCase()}`}
          onClick={() => onChange(opt)}
          className={`rounded-xl border px-3 py-2 text-left text-sm ${
            value === opt
              ? "border-violet-500 bg-violet-50 font-semibold text-slate-900"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TestMulti({
  q,
  value,
  onChange,
}: {
  q: AssessmentQuestion;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const cap = q.maxSelections ?? (q.options ?? []).length;
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt));
    else if (value.length < cap) onChange([...value, opt]);
  };

  return (
    <div className="space-y-1.5">
      {q.maxSelections ? (
        <p className="text-[10px] text-slate-500">Select up to {q.maxSelections}</p>
      ) : null}
      {(q.options ?? []).map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            data-testid={`multi-${q.id}-${opt.replace(/\s+/g, "-").toLowerCase()}`}
            onClick={() => toggle(opt)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
              active
                ? "border-emerald-500 bg-emerald-50 font-semibold text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function QuestionBlock({
  q,
  index,
  total,
  answers,
  setAnswer,
}: {
  q: AssessmentQuestion;
  index: number;
  total: number;
  answers: AttemptAnswers;
  setAnswer: (qid: string, value: number | string | string[]) => void;
}) {
  const raw = answers[q.id];
  const answered = coerceAnswer(q, raw) !== null;

  return (
    <article
      data-testid={`question-${q.id}`}
      className={`rounded-2xl border bg-white p-4 sm:p-5 ${
        answered ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Q{index + 1}/{total}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{q.prompt}</h3>
      <div className="mt-3">
        {q.type === "likert" ? (
          <TestLikert
            q={q}
            value={typeof raw === "number" ? raw : undefined}
            onChange={(n) => setAnswer(q.id, n)}
          />
        ) : null}
        {q.type === "single" ? (
          <TestSingle
            q={q}
            value={typeof raw === "string" ? raw : undefined}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ) : null}
        {q.type === "multi" ? (
          <TestMulti
            q={q}
            value={Array.isArray(raw) ? raw : []}
            onChange={(v) => setAnswer(q.id, v)}
          />
        ) : null}
      </div>
    </article>
  );
}

export function TestAssessmentPage() {
  const router = useRouter();
  const { effectiveUid, ready, ensureAnonymousSession, hasGoogleIdentity } = useFirebaseAuth();
  const { requirePayment } = useAppSettings();
  const [localUid, setLocalUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Test User");
  const [ageRange, setAgeRange] = useState<string>(PROFILE_AGE_OPTIONS[2]);
  const [gender, setGender] = useState<string>("Prefer not to say");
  const [answers, setAnswers] = useState<AttemptAnswers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const oceanDef = useMemo(() => getDefaultAssessment(), []);
  const wellnessDef = useMemo(() => getWellnessContextQuestionnaire(), []);
  const oceanQuestions = useMemo(() => flattenQuestions(oceanDef), [oceanDef]);
  const wellnessQuestions = useMemo(
    () => flattenQuestions(wellnessDef).filter((q) => !WELLNESS_PROFILE_SKIP.has(q.id)),
    [wellnessDef],
  );
  const allQuestions = useMemo(
    () => [...oceanQuestions, ...wellnessQuestions],
    [oceanQuestions, wellnessQuestions],
  );

  useEffect(() => {
    queueMicrotask(() => setLocalUid(getOrCreateLocalUid()));
  }, []);

  const attemptUid = effectiveUid ?? localUid;

  const setAnswer = useCallback((qid: string, value: number | string | string[]) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }, []);

  const profileAnswers = useMemo(
    (): AttemptAnswers => ({
      [PARTICIPANT_DISPLAY_NAME_KEY]: displayName.trim(),
      wc_age_range: ageRange,
      wc_gender: gender,
    }),
    [displayName, ageRange, gender],
  );

  const answeredCount = useMemo(() => {
    let n = 0;
    if (displayName.trim()) n += 1;
    if (ageRange) n += 1;
    if (gender) n += 1;
    for (const q of allQuestions) {
      if (coerceAnswer(q, answers[q.id]) !== null) n += 1;
    }
    return n;
  }, [allQuestions, answers, displayName, ageRange, gender]);

  const totalCount = allQuestions.length + 3;
  const canSubmit = useMemo(() => {
    if (!displayName.trim() || !ageRange || !gender) return false;
    return allQuestions.every((q) => coerceAnswer(q, answers[q.id]) !== null);
  }, [allQuestions, answers, displayName, ageRange, gender]);

  const fillRandom = useCallback(() => {
    setDisplayName("Test User");
    setAgeRange(PROFILE_AGE_OPTIONS[2]);
    setGender("Prefer not to say");
    setAnswers({
      ...randomAnswersForQuestions(oceanQuestions),
      ...randomAnswersForQuestions(wellnessQuestions),
    });
  }, [oceanQuestions, wellnessQuestions]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !attemptUid) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const attemptId = crypto.randomUUID();
      const claimSecret = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
      try {
        localStorage.setItem(claimStorageKey(attemptId), claimSecret);
        sessionStorage.setItem(
          SESSION_ATTEMPT_CLAIM_KEY,
          JSON.stringify({ attemptId, claimSecret }),
        );
      } catch {
        /* private mode */
      }

      let saveUid = attemptUid;
      if (isFirebaseConfigured()) {
        const firebaseUid = await ensureAnonymousSession();
        if (!firebaseUid) throw new Error("Could not start a session. Check your connection.");
        saveUid = firebaseUid;
      }

      const mergedRaw: AttemptAnswers = {
        ...answers,
        ...profileAnswers,
      };
      const mergedOcean = normalizeAnswersForQuestionnaire(oceanDef, mergedRaw);
      const merged = normalizeAnswersForQuestionnaire(wellnessDef, mergedOcean);

      for (const q of allQuestions) {
        if (coerceAnswer(q, merged[q.id]) === null) {
          throw new Error(`Missing answer: ${q.prompt}`);
        }
      }

      const personaConfig = await fetchPersonaScoringConfig();
      const scores = computeAttemptScores(merged, personaConfig);
      const personaAnalysis = scores.persona ?? null;

      await upsertAttempt({
        id: attemptId,
        uid: saveUid,
        assessmentId: defaultAssessmentId,
        answers: merged,
        scores,
        personaAnalysis,
        paymentStatus: "pending",
        shareToken: null,
        isLatestShareEligible: false,
        claimSecret,
      });

      const pvPath = typeof window !== "undefined" ? window.location.pathname : "/test";
      await trackAssessmentComplete({
        uid: saveUid,
        assessmentId: defaultAssessmentId,
        path: pvPath,
        requirePayment,
      });

      if (requirePayment) {
        router.push(`/checkout?attemptId=${encodeURIComponent(attemptId)}`);
        return;
      }

      if (isFirebaseConfigured() && !hasGoogleIdentity) {
        router.push(`/after-assessment/${encodeURIComponent(attemptId)}?next=results`);
        return;
      }

      router.push(`/results/${encodeURIComponent(attemptId)}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }, [
    allQuestions,
    answers,
    attemptUid,
    canSubmit,
    ensureAnonymousSession,
    hasGoogleIdentity,
    oceanDef,
    profileAnswers,
    requirePayment,
    router,
    wellnessDef,
  ]);

  if (!testRouteAllowed()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-bold text-slate-900">Test page unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enable with <code className="text-xs">NEXT_PUBLIC_ENABLE_TEST_TOOLS=true</code> or run in development.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-semibold text-sky-700">
            ← Home
          </Link>
        </div>
      </div>
    );
  }

  if (!ready || attemptUid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Preparing session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-28">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="shrink-0">
            <BrandLogo heightClass="h-7" withWordmark wordmarkClassName="text-sm" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
              QA /test
            </span>
            <NavAuthActions />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <h1 className="text-lg font-bold text-slate-900">Automated test assessment</h1>
          <p className="mt-1 text-sm text-slate-600">
            Profile + {oceanQuestions.length} personality + {wellnessQuestions.length} wellness questions on one page.
            Single submit → results. Sign in with Google above to use the same account as production.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="test-fill-random"
              onClick={fillRandom}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Fill all random
            </button>
            <span className="self-center text-xs text-slate-500">
              {answeredCount}/{totalCount} complete
            </span>
          </div>
        </div>

        <section className="mb-8 space-y-4" data-testid="test-profile-section">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Profile</h2>
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="text-xs font-semibold text-slate-700">Name</span>
              <input
                data-testid="test-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Age range</span>
              <select
                data-testid="test-age"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {PROFILE_AGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-700">Gender</span>
              <select
                data-testid="test-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {PROFILE_GENDER_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mb-8 space-y-3" data-testid="test-ocean-section">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Personality inventory ({oceanQuestions.length})
          </h2>
          <div className="space-y-3">
            {oceanQuestions.map((q, i) => (
              <QuestionBlock
                key={q.id}
                q={q}
                index={i}
                total={oceanQuestions.length}
                answers={answers}
                setAnswer={setAnswer}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3" data-testid="test-wellness-section">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Wellness context ({wellnessQuestions.length})
          </h2>
          <div className="space-y-3">
            {wellnessQuestions.map((q, i) => (
              <QuestionBlock
                key={q.id}
                q={q}
                index={i}
                total={wellnessQuestions.length}
                answers={answers}
                setAnswer={setAnswer}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          {submitError ? <p className="text-xs text-red-700">{submitError}</p> : <span />}
          <button
            type="button"
            data-testid="test-submit"
            disabled={!canSubmit || submitting}
            onClick={() => void handleSubmit()}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit & open report"}
          </button>
        </div>
      </footer>
    </div>
  );
}
