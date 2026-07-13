"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { APP_LINK_BACK } from "@/components/marketing/marketing-brand";
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
import { WELLNESS_FRESH_ATTEMPT_KEY } from "@/lib/assessment/layout";
import { mergeProfileDraftIntoAnswers } from "@/lib/assessment/session-recovery";
import {
  getWellnessContextQuestionnaire,
  isQuestionVisible,
  resolveQuestionOptions,
  WELLNESS_CONTEXT_PREFIX,
  wellnessContextAssessmentId,
} from "@/data/wellness-context-questionnaire";
import {
  ageBandTagFromYears,
  computeAgeYearsFromDate,
  parseIsoDate,
  WELLNESS_DATE_OF_BIRTH_KEY,
} from "@/lib/recommendations/compute-wellness-age";
import type { AssessmentDefinition, AssessmentQuestion, AssessmentSection, AttemptAnswers } from "@/types/models";

const WELLNESS_AGE_RANGE_KEY = `${WELLNESS_CONTEXT_PREFIX}age_range`;
const WELLNESS_PREF_KEY = `${WELLNESS_CONTEXT_PREFIX}preferred_activities`;
const WELLNESS_DETAILS_KEY = `${WELLNESS_CONTEXT_PREFIX}preferred_activity_details`;

const AGE_BAND_TAG_TO_OPTION: Record<string, string> = {
  age_under_18: "Under 18",
  age_18_24: "18–24",
  age_25_34: "25–34",
  age_35_44: "35–44",
  age_45_54: "45–54",
  age_55_plus: "55+",
};

function ageBandOptionFromDob(iso: string): string | null {
  const dob = parseIsoDate(iso);
  if (!dob) return null;
  const tag = ageBandTagFromYears(computeAgeYearsFromDate(dob));
  return AGE_BAND_TAG_TO_OPTION[tag] ?? null;
}

function flattenQuestions(def: AssessmentDefinition, answers: AttemptAnswers = {}): AssessmentQuestion[] {
  const order: AssessmentQuestion[] = [];
  for (const sec of def.sections) {
    for (const qid of sec.questionIds) {
      const q = def.questions[qid];
      if (q && isQuestionVisible(q, answers)) order.push(q);
    }
  }
  return order;
}

function allSectionsComplete(def: AssessmentDefinition, answers: AttemptAnswers): boolean {
  return def.sections.every((sec) =>
    sec.questionIds.every((qid) => {
      const q = def.questions[qid];
      if (!q) return true;
      if (!isQuestionVisible(q, answers)) return true;
      return coerceAnswer(q, answers[q.id]) !== null;
    }),
  );
}

function computeInitialActiveIndex(questions: AssessmentQuestion[], answers: AttemptAnswers): number {
  for (let i = 0; i < questions.length; i++) {
    if (coerceAnswer(questions[i], answers[questions[i].id]) === null) return i;
  }
  return Math.max(0, questions.length - 1);
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
  const searchParams = useSearchParams();
  const focusQuestionId = searchParams.get("q");
  const returnPath = searchParams.get("return");
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [oceanAnswerCount, setOceanAnswerCount] = useState(0);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusAppliedRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clampMaxRef = useRef<number | null>(null);
  const scrollLockedRef = useRef(false);

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
  const questions = useMemo(
    () => (questionnaire ? flattenQuestions(questionnaire, answers) : []),
    [questionnaire, answers],
  );
  const total = questions.length;

  const answeredCount = useMemo(
    () => questions.reduce((n, q) => n + (coerceAnswer(q, answers[q.id]) !== null ? 1 : 0), 0),
    [questions, answers],
  );

  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

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
    if (typeof window === "undefined" || complete || sessionLoading) return;
    scrollToActive(activeIndex);
  }, [activeIndex, complete, scrollToActive, sessionLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      if (clampMaxRef.current == null || scrollLockedRef.current) return;
      if (window.pageYOffset > clampMaxRef.current) window.scrollTo(0, clampMaxRef.current);
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

        const withProfile = mergeProfileDraftIntoAnswers(existing);
        const profileAdded = Object.keys(withProfile).some((key) => withProfile[key] !== existing[key]);

        if (freshWellness && !wellnessPrefilled && Object.keys(existing).length === 0) {
          const cleaned: AttemptAnswers = mergeProfileDraftIntoAnswers({ ...source });
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
        } else if (profileAdded) {
          const mergedAttemptAnswers = mergeProfileDraftIntoAnswers(attempt.answers ?? {});
          void upsertAttempt({
            id: attemptId,
            uid: attempt.uid,
            assessmentId: attempt.assessmentId,
            answers: mergedAttemptAnswers,
            scores: attempt.scores ?? null,
            personaAnalysis: attempt.personaAnalysis ?? null,
            paymentStatus: attempt.paymentStatus,
            shareToken: attempt.shareToken ?? null,
            isLatestShareEligible: Boolean(attempt.isLatestShareEligible),
          });
        }

        const flat = flattenQuestions(questionnaire, withProfile);
        const startIdx = computeInitialActiveIndex(flat, withProfile);
        setOceanAnswerCount(ocean);
        setAnswers(withProfile);
        setActiveIndex(startIdx);
        setComplete(flat.length > 0 && flat.every((q) => coerceAnswer(q, withProfile[q.id]) !== null));
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
    setAnswers((prev) => {
      const next: AttemptAnswers = { ...prev, [qid]: value };
      if (qid === WELLNESS_PREF_KEY) {
        const probe = { ...next };
        const detailsQ = questionnaire?.questions[WELLNESS_DETAILS_KEY];
        if (detailsQ && !isQuestionVisible(detailsQ, probe)) {
          delete next[WELLNESS_DETAILS_KEY];
        } else if (detailsQ && Array.isArray(next[WELLNESS_DETAILS_KEY])) {
          const allowed = new Set(resolveQuestionOptions(detailsQ, probe));
          next[WELLNESS_DETAILS_KEY] = (next[WELLNESS_DETAILS_KEY] as string[]).filter((o) =>
            allowed.has(o),
          );
        }
      }
      return next;
    });
  }, [questionnaire]);

  const advanceAfterAnswer = useCallback(
    (qi: number) => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => {
        if (qi === total - 1) setComplete(true);
        else {
          setActiveIndex(qi + 1);
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

  useEffect(() => {
    if (!focusQuestionId || !questions.length || sessionLoading || focusAppliedRef.current) return;
    const idx = questions.findIndex((q) => q.id === focusQuestionId);
    if (idx < 0) return;
    focusAppliedRef.current = true;
    queueMicrotask(() => {
      setActiveIndex(idx);
      setComplete(false);
    });
  }, [focusQuestionId, questions, sessionLoading]);

  const allComplete = useMemo(
    () => (questionnaire ? allSectionsComplete(questionnaire, answers) : false),
    [questionnaire, answers],
  );

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
        returnPath ?? `/submission-confirmed/${encodeURIComponent(attemptId)}?next=${encodeURIComponent(afterPath)}`,
      );
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Could not submit. Please try again.");
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
    returnPath,
    router,
  ]);

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
        <Link href="/" className={`mt-6 inline-block ${APP_LINK_BACK}`}>
          ← Back to home
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href="/" className={`mt-6 inline-block ${APP_LINK_BACK}`}>
          ← Back to home
        </Link>
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
          percent={progressPct}
          trailing={
            <>
              {returnPath ? (
                <Link
                  href={returnPath}
                  className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white"
                >
                  ← Review
                </Link>
              ) : null}
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:inline">
                Step 2 · Context
              </span>
            </>
          }
        />
      </AssessGlassHeader>

      <AssessAtmosphere />

      <AssessIntro
        badge="Wellness context"
        title="A few details so your plan fits real life."
        subtitle={
          oceanAnswerCount > 0
            ? "Sleep, stress, goals, and barriers — answer one at a time. Scroll up anytime to change an earlier answer."
            : (questionnaire.description ?? "A short set of questions so recommendations fit your life.")
        }
      />

      {questionnaireError ? (
        <div className={`relative z-[1] ${ASSESS_CONTENT_MAX} ${ASSESS_PAD}`}>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-950">
            {questionnaireError}
          </p>
        </div>
      ) : null}

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
          const sectionHeader = questionnaire ? sectionHeaderForQuestion(questionnaire, q.id) : null;

          return (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[idx] = el;
              }}
              className="assess-card"
              style={assessCardStyle(visual)}
            >
              {sectionHeader ? (
                <p
                  className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: visual.isActive ? "rgba(255,255,255,.45)" : "#00A8A7" }}
                >
                  {sectionHeader.title.replace(/^Section \d+ — /, "")}
                </p>
              ) : null}
              <div className="mb-3.5 text-xs font-bold tracking-[0.5px]" style={{ color: visual.numberColor }}>
                Question {idx + 1} of {total}
              </div>
              <h2
                className="m-0 mb-3 leading-[1.42] font-bold tracking-[-0.01em]"
                style={{ fontSize: visual.textSize, color: visual.textColor }}
              >
                {q.prompt}
              </h2>
              {q.caption ? (
                <p className="mb-7 text-sm" style={{ color: visual.captionColor }}>
                  {q.caption}
                </p>
              ) : (
                <div className="mb-7" />
              )}

              {q.type === "likert" ? (
                <LikertCircles
                  scaleMin={q.scaleMin ?? 1}
                  scaleMax={q.scaleMax ?? 7}
                  minLabel={q.scaleMinLabel ?? "Low"}
                  midLabel="Neutral"
                  maxLabel={q.scaleMaxLabel ?? "High"}
                  value={likertVal}
                  isActive={visual.isActive}
                  disabled={visual.pointerEvents === "none"}
                  onChange={(n) => onLikertOrSingle(idx, n)}
                />
              ) : null}

              {q.type === "single" ? (
                <div className="space-y-5">
                  {q.id === WELLNESS_AGE_RANGE_KEY ? (
                    <div>
                      <label
                        htmlFor={`${q.id}-dob`}
                        className="mb-2 block text-xs font-semibold"
                        style={{ color: visual.isActive ? "rgba(255,255,255,.7)" : "#374151" }}
                      >
                        Date of birth
                      </label>
                      <input
                        id={`${q.id}-dob`}
                        type="date"
                        max={new Date().toISOString().slice(0, 10)}
                        value={
                          typeof answers[WELLNESS_DATE_OF_BIRTH_KEY] === "string"
                            ? answers[WELLNESS_DATE_OF_BIRTH_KEY]
                            : ""
                        }
                        onChange={(e) => {
                          const iso = e.target.value;
                          setAnswers((prev) => {
                            const next: AttemptAnswers = { ...prev, [WELLNESS_DATE_OF_BIRTH_KEY]: iso };
                            const band = ageBandOptionFromDob(iso);
                            if (band) next[WELLNESS_AGE_RANGE_KEY] = band;
                            return next;
                          });
                          if (iso && idx === activeIndex) {
                            const band = ageBandOptionFromDob(iso);
                            if (band) advanceAfterAnswer(idx);
                          }
                        }}
                        className="w-full max-w-sm rounded-xl border px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2"
                        style={
                          visual.isActive
                            ? {
                                borderColor: "rgba(255,255,255,.22)",
                                background: "rgba(255,255,255,.08)",
                                color: "#fff",
                              }
                            : {
                                borderColor: "#E5E7EB",
                                background: "#fff",
                                color: "#0D1B2A",
                              }
                        }
                      />
                      <p className="mt-2 text-[11px]" style={{ color: visual.captionColor }}>
                        Or pick an age band below if you prefer not to enter your exact date.
                      </p>
                    </div>
                  ) : null}
                  <SingleChoiceStack
                    options={q.options ?? []}
                    value={singleVal}
                    isActive={visual.isActive}
                    disabled={visual.pointerEvents === "none"}
                    columns={(q.options?.length ?? 0) > 4}
                    onChange={(v) => onLikertOrSingle(idx, v)}
                  />
                </div>
              ) : null}

              {q.type === "multi" ? (
                <MultiChoiceStack
                  options={resolveQuestionOptions(q, answers)}
                  value={multiVal}
                  maxSelections={q.maxSelections}
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
          title="Context complete."
          body={
            allComplete
              ? "We'll use this alongside your personality profile to personalize your report."
              : "Some answers still look incomplete — scroll up to review."
          }
          ctaLabel={
            submitting ? "Saving…" : returnPath ? "Save & return to review" : "Submit responses"
          }
          disabled={!allComplete}
          busy={submitting}
          error={submitError}
          hint={!allComplete ? "Finish every question before submitting." : null}
          onCta={() => {
            void handleSubmit();
          }}
        />
      ) : null}
    </div>
  );
}
