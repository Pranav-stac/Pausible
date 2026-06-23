import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { callGeminiSection, parseSectionJson } from "@/lib/recommendations/gemini-api-client";
import { callOpenAiSection } from "@/lib/recommendations/openai-api-client";
import {
  buildDeterministicGoalFraming,
  buildDeterministicPlanBuiltNarrative,
  buildDeterministicPlanSubtitle,
} from "@/lib/recommendations/plan/build-plan-built-narrative";
import { sanitizeIntegratedPlanFields } from "@/lib/recommendations/plan/plan-blocklist";
import {
  formatReadinessLine,
  toPlanActionLine,
} from "@/lib/recommendations/plan/plan-phase-display";
import {
  buildIntegratedPlanPrompt,
  PLAN_PAGE_SYSTEM_PROMPT,
  type IntegratedPlanPromptJson,
} from "@/lib/recommendations/plan/plan-synthesis-prompts";
import { enforceIntegratedPlanLimits } from "@/lib/recommendations/plan/plan-text-limits";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";
import type {
  IntegratedPlanSynthesis,
  OpportunityCard,
  PlanOutput,
  PlanRecommendationItem,
  UserProfile,
} from "@/lib/recommendations/types";

const PLAN_PAGE_OPENAI_MODEL = process.env.OPENAI_PLAN_MODEL?.trim() || "gpt-5.4-mini";

function mergeRhythmLines(
  aiLines: string[] | undefined,
  engineItems: PlanRecommendationItem[],
  max: number,
): string[] {
  const cleaned = (aiLines ?? []).map((line) => toPlanActionLine(line, 85)).filter(Boolean).slice(0, max);
  if (cleaned.length > 0) return cleaned;
  return engineItems.slice(0, max).map((item) => toPlanActionLine(item.text, 85));
}

function mergePhaseRhythm(
  phase: PlanOutput["phases"][number],
  hit: IntegratedPlanPromptJson["phases"] extends (infer P)[] | undefined ? P | undefined : undefined,
  synthesized: boolean,
) {
  const engineAnchor = toPlanActionLine(phase.anchor_habit.text, 90);
  const engineDaily = phase.daily_rhythm;
  const engineWeekly = phase.weekly_rhythm;

  if (!synthesized) {
    return {
      anchor_habit_user: engineAnchor,
      daily_rhythm_user: engineDaily.slice(0, 3).map((item) => toPlanActionLine(item.text, 85)),
      weekly_rhythm_user: engineWeekly.slice(0, 3).map((item) => toPlanActionLine(item.text, 85)),
    };
  }

  return {
    anchor_habit_user: hit?.anchor_habit_user?.trim()
      ? toPlanActionLine(hit.anchor_habit_user, 90)
      : engineAnchor,
    daily_rhythm_user: mergeRhythmLines(hit?.daily_rhythm_user, engineDaily, 3),
    weekly_rhythm_user: mergeRhythmLines(hit?.weekly_rhythm_user, engineWeekly, 3),
  };
}

function resolvePlanBuiltNarrative(
  parsed: IntegratedPlanPromptJson | null,
  fallbackNarrative: string,
): string {
  const narrative = parsed?.plan_built_narrative?.trim();
  if (narrative) return narrative;

  const legacyNotes = (parsed?.plan_notes ?? []).filter(Boolean);
  if (legacyNotes.length) return legacyNotes.join(" ");

  return fallbackNarrative;
}

function deterministicIntegratedPlan(
  planOutput: PlanOutput,
  profile: UserProfile,
  input?: BuildProfileInput,
  priorityCards?: OpportunityCard[],
  secondaryBlendPct?: number,
): IntegratedPlanSynthesis {
  const plan_built_narrative = buildDeterministicPlanBuiltNarrative({
    planOutput,
    profile,
    input,
    priorityCards,
    secondaryBlendPct,
  });

  return {
    plan_subtitle: buildDeterministicPlanSubtitle(profile),
    goal_framing: buildDeterministicGoalFraming(profile),
    phases: planOutput.phases.map((phase) => ({
      phase_number: phase.phase_number,
      phase_intent_user: phase.intent,
      readiness_signal_user: formatReadinessLine(phase.readiness_signal.description),
      anchor_habit_user: toPlanActionLine(phase.anchor_habit.text, 90),
      daily_rhythm_user: phase.daily_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, 85)),
      weekly_rhythm_user: phase.weekly_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, 85)),
    })),
    plan_built_narrative,
    plan_notes: [],
    synthesized: false,
  };
}

function mergeParsedPlan(
  planOutput: PlanOutput,
  profile: UserProfile,
  parsed: IntegratedPlanPromptJson | null,
  synthesized: boolean,
  input?: BuildProfileInput,
  priorityCards?: OpportunityCard[],
  secondaryBlendPct?: number,
  synthesisError?: string | null,
): IntegratedPlanSynthesis {
  const fallback = deterministicIntegratedPlan(planOutput, profile, input, priorityCards, secondaryBlendPct);

  const phases = planOutput.phases.map((phase) => {
    const hit = parsed?.phases?.find((p) => p.phase_number === phase.phase_number);
    const rhythm = mergePhaseRhythm(phase, hit, synthesized);
    const readinessRaw = hit?.readiness_signal_user?.trim() || phase.readiness_signal.description;
    return {
      phase_number: phase.phase_number,
      phase_intent_user: hit?.phase_intent_user?.trim() || phase.intent,
      readiness_signal_user: formatReadinessLine(readinessRaw),
      ...rhythm,
    };
  });

  const raw = {
    plan_subtitle: parsed?.plan_subtitle?.trim() || fallback.plan_subtitle,
    goal_framing: parsed?.goal_framing?.trim() || fallback.goal_framing,
    phases,
    plan_built_narrative: resolvePlanBuiltNarrative(parsed, fallback.plan_built_narrative),
    plan_notes: [] as string[],
  };

  const limited = enforceIntegratedPlanLimits(raw);
  const { sanitized, violations } = sanitizeIntegratedPlanFields(limited);

  if (violations.length) {
    console.warn("[plan-page] blocklist violations:", violations);
  }

  return {
    plan_subtitle: sanitized.plan_subtitle,
    goal_framing: sanitized.goal_framing,
    phases: sanitized.phases,
    plan_built_narrative: sanitized.plan_built_narrative,
    plan_notes: sanitized.plan_notes,
    synthesized,
    synthesisError: synthesisError ?? (violations.length ? "blocklist_sanitized" : null),
  };
}

export async function synthesizeIntegratedPlanPage(
  planOutput: PlanOutput | null,
  profile: UserProfile,
  input: BuildProfileInput | undefined,
  provider: ReportLlmProvider,
  priorityCards: OpportunityCard[] = [],
): Promise<IntegratedPlanSynthesis | null> {
  if (!planOutput || planOutput.total_phases === 0) return null;

  const secondaryBlendPct = input?.scores?.persona?.personaPercentages?.[profile.secondaryPersona];
  const fitScore = input?.scores?.persona?.fitScore;
  const fallback = deterministicIntegratedPlan(
    planOutput,
    profile,
    input,
    priorityCards,
    secondaryBlendPct,
  );
  const userPrompt = buildIntegratedPlanPrompt(
    planOutput,
    profile,
    secondaryBlendPct,
    priorityCards,
    fitScore,
  );

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = provider === "gpt" ? openaiKey : geminiKey;

  if (!apiKey) {
    return {
      ...fallback,
      synthesisError: "LLM API key not configured — showing deterministic plan copy.",
    };
  }

  const callArgs = {
    apiKey,
    model:
      provider === "gpt"
        ? PLAN_PAGE_OPENAI_MODEL
        : process.env.GEMINI_PLAN_MODEL?.trim() || "gemini-3.5-flash",
    systemPrompt: PLAN_PAGE_SYSTEM_PROMPT,
    userPrompt,
    json: true,
    maxOutputTokens: SECTION_OUTPUT_TOKENS.integratedPlan,
  };

  let result =
    provider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);

  let parsed = parseSectionJson<IntegratedPlanPromptJson>(result.text);
  if (result.text.trim() && !parsed?.plan_subtitle?.trim()) {
    result =
      provider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);
    parsed = parseSectionJson<IntegratedPlanPromptJson>(result.text);
  }

  if (result.error || !parsed?.plan_subtitle?.trim()) {
    return mergeParsedPlan(
      planOutput,
      profile,
      null,
      false,
      input,
      priorityCards,
      secondaryBlendPct,
      result.error ?? "Invalid JSON from plan page synthesis",
    );
  }

  return mergeParsedPlan(
    planOutput,
    profile,
    parsed,
    true,
    input,
    priorityCards,
    secondaryBlendPct,
    null,
  );
}

export { deterministicIntegratedPlan };
