import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { coerceOptionalPlanText, coercePlanText } from "@/lib/recommendations/plan/coerce-plan-field";
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
import { PLAN_TEXT_LIMITS } from "@/lib/recommendations/plan/plan-text-limits";
import {
  buildIntegratedPlanPrompt,
  type IntegratedPlanPromptJson,
} from "@/lib/recommendations/plan/plan-synthesis-prompts";
import { buildSystemPrompt } from "@/lib/recommendations/gemini-section-prompts";
import { validatePostSynthesis } from "@/lib/recommendations/report-validation";
import { enforceIntegratedPlanLimits, isCompleteSentence } from "@/lib/recommendations/plan/plan-text-limits";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";
import type {
  IntegratedPlanSynthesis,
  OpportunityCard,
  PlanOutput,
  UserProfile,
} from "@/lib/recommendations/types";

const PLAN_PAGE_OPENAI_MODEL = process.env.OPENAI_PLAN_MODEL?.trim() || "gpt-5.4-mini";

const RHYTHM_MAX = PLAN_TEXT_LIMITS.rhythm_line;
const ANCHOR_MAX = PLAN_TEXT_LIMITS.anchor_habit_user;

function engineRhythmLines(
  phase: PlanOutput["phases"][number],
): {
  anchor_habit_user: string;
  daily_rhythm_user: string[];
  weekly_rhythm_user: string[];
} {
  return {
    anchor_habit_user: toPlanActionLine(phase.anchor_habit.text, ANCHOR_MAX),
    daily_rhythm_user: phase.daily_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, RHYTHM_MAX)),
    weekly_rhythm_user: phase.weekly_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, RHYTHM_MAX)),
  };
}

function mergePhaseRhythm(
  phase: PlanOutput["phases"][number],
  _hit: IntegratedPlanPromptJson["phases"] extends (infer P)[] | undefined ? P | undefined : undefined,
) {
  return engineRhythmLines(phase);
}

function resolvePlanBuiltNarrative(
  parsed: IntegratedPlanPromptJson | null,
  fallbackNarrative: string,
): string {
  const narrative = coerceOptionalPlanText(parsed?.plan_built_narrative);
  if (narrative) return narrative;

  const legacyNotes = (parsed?.plan_notes ?? [])
    .map((note) => coercePlanText(note, ""))
    .filter(Boolean);
  if (legacyNotes.length) return legacyNotes.join(" ");

  return fallbackNarrative;
}

function resolvePlanSubtitle(
  ai: unknown,
  profile: UserProfile,
  secondaryBlendPct?: number,
): string {
  const fallback = buildDeterministicPlanSubtitle(profile, secondaryBlendPct);
  const candidate = coerceOptionalPlanText(ai);
  if (!candidate) return fallback;
  if (!isCompleteSentence(candidate)) return fallback;
  return candidate;
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
    plan_subtitle: buildDeterministicPlanSubtitle(profile, secondaryBlendPct),
    goal_framing: buildDeterministicGoalFraming(profile),
    phases: planOutput.phases.map((phase) => ({
      phase_number: phase.phase_number,
      phase_intent_user: phase.intent,
      readiness_signal_user: formatReadinessLine(phase.readiness_signal.description),
      anchor_habit_user: toPlanActionLine(phase.anchor_habit.text, ANCHOR_MAX),
      daily_rhythm_user: phase.daily_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, RHYTHM_MAX)),
      weekly_rhythm_user: phase.weekly_rhythm.slice(0, 3).map((item) => toPlanActionLine(item.text, RHYTHM_MAX)),
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
    const rhythm = mergePhaseRhythm(phase, hit);
    const readinessRaw =
      coercePlanText(hit?.readiness_signal_user, phase.readiness_signal.description) ||
      phase.readiness_signal.description;
    return {
      phase_number: phase.phase_number,
      phase_intent_user: coercePlanText(hit?.phase_intent_user, phase.intent),
      readiness_signal_user: formatReadinessLine(readinessRaw),
      ...rhythm,
    };
  });

  const raw = {
    plan_subtitle: resolvePlanSubtitle(parsed?.plan_subtitle, profile, secondaryBlendPct),
    goal_framing: coercePlanText(parsed?.goal_framing, fallback.goal_framing),
    phases,
    plan_built_narrative: resolvePlanBuiltNarrative(parsed, fallback.plan_built_narrative),
    plan_notes: [] as string[],
  };

  const limited = enforceIntegratedPlanLimits(raw);
  const planSubtitle = isCompleteSentence(limited.plan_subtitle)
    ? limited.plan_subtitle
    : buildDeterministicPlanSubtitle(profile, secondaryBlendPct);
  const { sanitized, violations } = sanitizeIntegratedPlanFields({
    ...limited,
    plan_subtitle: planSubtitle,
  });

  if (violations.length) {
    console.warn("[plan-page] blocklist violations:", violations);
  }

  const postGate = validatePostSynthesis({
    planSubtitle: sanitized.plan_subtitle,
    planBuiltNarrative: sanitized.plan_built_narrative,
    planPhaseIntents: sanitized.phases.map((p) => p.phase_intent_user),
    planReadinessSignals: sanitized.phases.map((p) => p.readiness_signal_user),
  });

  if (postGate.useFallback && synthesized) {
    return {
      ...fallback,
      synthesized: false,
      synthesisError: postGate.violations.join("; ") || "post_gate_plan_page",
    };
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
    systemPrompt: buildSystemPrompt(),
    userPrompt,
    json: true,
    maxOutputTokens: SECTION_OUTPUT_TOKENS.integratedPlan,
  };

  let result =
    provider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);

  let parsed = parseSectionJson<IntegratedPlanPromptJson>(result.text);
  const parsedSubtitle = coerceOptionalPlanText(parsed?.plan_subtitle);
  if (result.text.trim() && !parsedSubtitle) {
    result =
      provider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);
    parsed = parseSectionJson<IntegratedPlanPromptJson>(result.text);
  }

  const planSubtitle = coerceOptionalPlanText(parsed?.plan_subtitle);
  if (result.error || !planSubtitle) {
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
