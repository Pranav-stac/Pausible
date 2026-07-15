"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppPageShell } from "@/components/AppPageShell";
import { SubmissionAnswersReview } from "@/components/journey/SubmissionAnswersReview";
import {
  APP_BODY,
  APP_HEADING_MD,
  APP_LINK_BACK,
  APP_MUTED,
  APP_PAGE_BG_SOFT,
  BRAND_ACCENT_TEXT,
  CTA_PRIMARY_FULL_CLASS,
  FORM_CARD_CLASS,
} from "@/components/marketing/marketing-brand";
import { getWellnessContextQuestionnaire } from "@/data/wellness-context-questionnaire";
import { buildAttemptAnswerBlocks, countAnsweredRows } from "@/lib/admin/format-attempt-answer";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { fetchAttempt, patchAttempt } from "@/lib/data/attempt-service";
import { fetchPersonaScoringConfig } from "@/lib/data/persona-scoring-config-client";
import { computeAttemptScores } from "@/lib/scoring/compute-attempt-scores";
import type { AssessmentDefinition, AttemptAnswers } from "@/types/models";

const NEXT_STEPS = [
  "Analyze your personality patterns and behavioral tendencies",
  "Match recommendations to your goals, barriers, and lifestyle",
  "Build your personalized four-pillar action plan",
] as const;

export function SubmissionConfirmationScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const afterPath =
    params.get("next") ?? `/after-assessment/${encodeURIComponent(attemptId)}?next=results`;
  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [personalityAssessment, setPersonalityAssessment] = useState<AssessmentDefinition | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswers>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const attempt = await fetchAttempt(attemptId);
        if (cancelled) return;
        if (!attempt) {
          setLoadError("We could not find your assessment session. Please start again from the home page.");
          return;
        }
        if (!attempt.scores?.persona) {
          router.replace(`/wellness-context/${encodeURIComponent(attemptId)}`);
          return;
        }

        const personality = await fetchAssessment(attempt.assessmentId);
        if (cancelled) return;
        setPersonalityAssessment(personality);
        setAnswers(attempt.answers ?? {});
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load your session.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const assessments = useMemo(() => {
    const wellness = getWellnessContextQuestionnaire();
    return [personalityAssessment, wellness].filter((def): def is AssessmentDefinition => def != null);
  }, [personalityAssessment]);

  const answerBlocks = useMemo(
    () => buildAttemptAnswerBlocks(assessments, answers),
    [answers, assessments],
  );

  const { answered: answeredCount, total: totalCount } = useMemo(
    () => countAnsweredRows(answerBlocks),
    [answerBlocks],
  );

  const handleContinue = useCallback(() => {
    router.push(
      `/report-building/${encodeURIComponent(attemptId)}?next=${encodeURIComponent(afterPath)}`,
    );
  }, [afterPath, attemptId, router]);

  const handleSaveAnswers = useCallback(
    async (patch: Record<string, unknown>) => {
      const nextAnswers: AttemptAnswers = {
        ...answers,
        ...(patch as AttemptAnswers),
      };
      const personaConfig = await fetchPersonaScoringConfig();
      const scores = computeAttemptScores(nextAnswers, personaConfig);
      await patchAttempt(attemptId, {
        answers: nextAnswers,
        scores,
        personaAnalysis: scores.persona ?? null,
      });
      setAnswers(nextAnswers);
    },
    [answers, attemptId],
  );

  if (checking) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${APP_PAGE_BG_SOFT} ${APP_BODY}`}>
        Confirming your responses…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${APP_PAGE_BG_SOFT} px-5 text-center`}>
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href="/" className={`mt-6 font-semibold ${APP_LINK_BACK}`}>
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <AppPageShell stepLabel="Step 2 complete" contentClassName="!max-w-7xl !py-8 lg:!py-10">
      <div className={`${FORM_CARD_CLASS} p-6 text-center sm:p-8 lg:p-10`}>
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-2xl font-bold text-white shadow-[0_8px_24px_-6px_rgba(45,130,255,0.45)]"
          aria-hidden
        >
          ✓
        </div>

        <h1 className={`mt-7 ${APP_HEADING_MD}`}>Your responses are saved</h1>
        <p className={`mx-auto mt-4 max-w-3xl ${APP_BODY}`}>
          Thank you for completing both steps. Below is everything you answered — review it anytime before we build
          your personalized intelligence report.
        </p>
      </div>

      <div className="mt-6 grid gap-6 max-lg:pb-72 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 lg:pb-0 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
        <SubmissionAnswersReview
          blocks={answerBlocks}
          answeredCount={answeredCount}
          totalCount={totalCount}
          assessments={assessments}
          answers={answers}
          onSaveAnswers={handleSaveAnswers}
        />

        <aside
          className={`${FORM_CARD_CLASS} z-30 self-start p-6 text-left sm:p-7 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[min(52vh,28rem)] max-lg:overflow-y-auto max-lg:rounded-b-none max-lg:rounded-t-[22px] max-lg:border-x-0 max-lg:border-b-0 max-lg:shadow-[0_-18px_50px_-20px_rgba(17,24,39,0.35)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:shadow-[0_24px_60px_-28px_rgba(17,24,39,0.28)]`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6E7191]">What happens next</p>
          <ul className="mt-4 space-y-3">
            {NEXT_STEPS.map((step) => (
              <li key={step} className={`flex items-start gap-3 leading-snug ${APP_BODY} !text-sm`}>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#00C9C8]/15 text-[10px] font-bold ${BRAND_ACCENT_TEXT}`}>
                  ✓
                </span>
                {step}
              </li>
            ))}
          </ul>

          <button type="button" onClick={handleContinue} className={`mt-8 ${CTA_PRIMARY_FULL_CLASS}`}>
            Build my report
            <span className="ml-1.5" aria-hidden>
              →
            </span>
          </button>

          <p className={`mt-4 ${APP_MUTED} !text-xs`}>
            We’ll open your results as soon as your plan is ready. Your answers are saved — you can close this tab and return anytime.
          </p>
        </aside>
      </div>
    </AppPageShell>
  );
}
