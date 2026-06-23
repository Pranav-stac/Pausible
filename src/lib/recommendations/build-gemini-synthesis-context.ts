import { getWellnessContextQuestionnaire } from "@/data/wellness-context-questionnaire";
import type { RecommendationConfig, TagMappingRule, WellnessFieldConfig } from "@/lib/recommendations/firestore-config-types";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type {
  ActionPlanSelection,
  PillarName,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";
import { resolvedText } from "@/lib/recommendations/action-pool";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";
import { traitScoreBand, traitScoreBandLabel } from "@/lib/scoring/trait-level";
import type { AttemptAnswers } from "@/types/models";

export type GeminiSynthesisContext = {
  wellnessResponses: {
    section: string;
    question: string;
    answer: string;
    tags: string[];
  }[];
  personality: {
    primaryPersona: string;
    secondaryPersona: string;
    personaTitle: string;
    fitScore: number;
    fitTier: string;
    blendRatio: number;
    blendStrength: string;
    primarySummary: string;
    personaMix: { persona: string; pct: number }[];
    oceanTraits: { trait: string; score: number; band: string }[];
  };
  matchedProfile: {
    goals: { tag: string; label: string }[];
    barriers: { tag: string; label: string }[];
    context: { tag: string; label: string }[];
    exclusions: { tag: string; label: string }[];
  };
  rankedRecommendations: {
    id: string;
    pillar: string;
    category: string;
    type: string;
    text: string;
    strength: string;
    notes: string;
    totalScore: number;
    matchReasons: string[];
  }[];
  selectedPlan: ReturnType<typeof serializeSelectedPlan>;
};

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ");
}

function formatAnswer(raw: unknown): string {
  if (Array.isArray(raw)) return raw.join("; ");
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  return "";
}

function buildTagLabelMap(rules: TagMappingRule[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const rule of rules) {
    if (!map.has(rule.tag)) map.set(rule.tag, rule.responseValue);
  }
  return map;
}

function tagLabel(tag: string, labels: Map<string, string>): string {
  return labels.get(tag) ?? tag.replace(/_/g, " ");
}

function tagsForWellnessField(field: WellnessFieldConfig, answers: AttemptAnswers): string[] {
  const tags: string[] = [];
  const push = (t: string) => {
    if (!tags.includes(t)) tags.push(t);
  };

  if (field.kind === "likert_scale") {
    const level = answers[field.answerKey];
    const n = typeof level === "number" ? level : typeof level === "string" ? Number(level) : NaN;
    if (!Number.isFinite(n) || !field.likertBands) return tags;
    const band = field.likertBands.find((b) => n >= b.min && n <= b.max);
    if (band) push(band.tag);
    return tags;
  }

  const collectFromRaw = (raw: string) => {
    const key = norm(raw);
    const mapped = field.optionTags?.[key];
    if (!mapped) return;
    const list = Array.isArray(mapped) ? mapped : [mapped];
    list.forEach(push);
    if (field.inferBarrierTags?.length) {
      const poorSleep = tags.includes("sleep_quality_poor") || tags.includes("sleep_quality_very_poor");
      if (poorSleep) field.inferBarrierTags.forEach(push);
    }
  };

  if (field.kind === "multi") {
    const v = answers[field.answerKey];
    const arr = Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : [];
    for (const raw of arr) collectFromRaw(raw);
    return tags;
  }

  const raw = answers[field.answerKey];
  if (typeof raw === "string") collectFromRaw(raw);
  return tags;
}

function collectWellnessResponses(
  config: RecommendationConfig,
  answers: AttemptAnswers,
): GeminiSynthesisContext["wellnessResponses"] {
  const def = getWellnessContextQuestionnaire();
  const rows: GeminiSynthesisContext["wellnessResponses"] = [];

  for (const sec of def.sections) {
    for (const qid of sec.questionIds) {
      const q = def.questions[qid];
      if (!q) continue;
      const answer = formatAnswer(answers[qid]);
      if (!answer) continue;
      const field = config.wellnessFields.find((f) => f.answerKey === qid);
      const tags = field ? tagsForWellnessField(field, answers) : [];
      rows.push({
        section: sec.title.replace(/^Section \d+ — /, ""),
        question: q.prompt,
        answer,
        tags,
      });
    }
  }

  return rows;
}

function traitBandForScore(score: number): string {
  return traitScoreBandLabel(traitScoreBand(score)).toLowerCase();
}

function matchReasons(
  row: ScoredRecommendation,
  profile: UserProfile,
  labels: Map<string, string>,
): string[] {
  const reasons: string[] = [];
  const s = row.score;

  if (s.primaryPersonaMatch) reasons.push(`Primary persona fit (${profile.primaryPersonaAlias})`);
  if (s.secondaryPersonaMatch) reasons.push(`Secondary persona fit (${profile.secondaryPersonaAlias})`);
  if (s.allPersonasMatch) reasons.push("Applies to all personas");

  for (const g of s.matchedGoals) reasons.push(`Goal: ${tagLabel(g, labels)}`);
  for (const b of s.matchedBarriers) reasons.push(`Barrier: ${tagLabel(b, labels)}`);
  for (const c of s.matchedContext) reasons.push(`Context: ${tagLabel(c, labels)}`);
  for (const o of s.matchedOcean) reasons.push(`OCEAN tag: ${tagLabel(o, labels)}`);

  if (row.strength === "core") reasons.push("Core recommendation strength");
  else if (row.strength === "conditional" && s.matchedContext.length === 0) {
    reasons.push("Conditional — no context match (lower priority)");
  }

  if (row.notes.trim()) reasons.push(`Coach note: ${row.notes.trim()}`);

  return reasons;
}

function serializeScoredRow(
  row: ScoredRecommendation,
  profile: UserProfile,
  labels: Map<string, string>,
): GeminiSynthesisContext["rankedRecommendations"][number] {
  return {
    id: row.id,
    pillar: row.pillar,
    category: row.category.replace(/_/g, " "),
    type: row.type,
    text: resolvedText(row, profile),
    strength: row.strength,
    notes: row.notes,
    totalScore: row.score.total,
    matchReasons: matchReasons(row, profile, labels),
  };
}

function serializeSelectedPlan(selection: ActionPlanSelection, labels: Map<string, string>) {
  const rowBrief = (r: ScoredRecommendation) => serializeScoredRow(r, selection.profile, labels);

  const pillars = {} as Record<
    PillarName,
    {
      focusArea: string;
      focusReason: string;
      focusRow: ReturnType<typeof serializeScoredRow> | null;
      dos: ReturnType<typeof serializeScoredRow>[];
      donts: ReturnType<typeof serializeScoredRow>[];
    }
  >;

  for (const [pillar, plan] of Object.entries(selection.pillarPlans) as [PillarName, (typeof selection.pillarPlans)[PillarName]][]) {
    const focusRow =
      selection.ranked.find((r) => r.id === plan.focusId) ??
      selection.ranked.find((r) => plan.sourceIds.includes(r.id) && r.type === "mindset_shift") ??
      null;
    pillars[pillar] = {
      focusArea: plan.focusArea,
      focusReason: plan.focusReason,
      focusRow: focusRow ? rowBrief(focusRow) : null,
      dos: plan.dos
        .map((d) => selection.ranked.find((r) => r.id === d.id))
        .filter((r): r is ScoredRecommendation => Boolean(r))
        .map((r) => rowBrief(r)),
      donts: plan.donts
        .map((d) => selection.ranked.find((r) => r.id === d.id))
        .filter((r): r is ScoredRecommendation => Boolean(r))
        .map((r) => rowBrief(r)),
    };
  }

  return {
    opportunities: selection.opportunityCards.map((c) => ({
      id: c.id,
      pillar: c.pillar,
      category: c.category.replace(/_/g, " "),
      score: c.score,
      impactLevel: c.impactLevel,
      personaContextText: c.personaContextText,
    })),
    pillars,
    launchpad: selection.launchpad.map((item) => {
      const row = selection.ranked.find((r) => r.id === item.id);
      return {
        group: item.group,
        text: item.text,
        row: row ? rowBrief(row) : null,
      };
    }),
    coachNotes: selection.coachSourceRows.map((r) => rowBrief(r)),
    piSeries: selection.piSeries,
    safetyGuidance: selection.safetyGuidance.map((r) => rowBrief(r)),
  };
}

export function buildGeminiSynthesisContext(
  input: BuildProfileInput,
  config: RecommendationConfig,
  selection: ActionPlanSelection,
): GeminiSynthesisContext {
  const { answers, scores } = input;
  const profile = selection.profile;
  const labels = buildTagLabelMap(config.tagMappingRules);

  const primaryKey = profile.primaryPersona;
  const secondaryKey = profile.secondaryPersona;
  const primaryCopy = PERSONA_DISPLAY[primaryKey];

  const pcts = scores?.persona?.personaPercentages;
  const personaMix = pcts
    ? [...PERSONA_KEYS]
        .map((k) => ({ persona: personaLabel(k), pct: pcts[k as PersonaKey] ?? 0 }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 6)
    : [];

  const traitAvgs = scores?.persona?.traitAverages;
  const oceanTraits = traitAvgs
    ? (["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const).map((k) => {
        const score = traitAvgs[k] ?? 0;
        return {
          trait: k.replace(/_/g, " "),
          score,
          band: traitBandForScore(score),
        };
      })
    : [];

  const mapTags = (tags: string[]) => tags.map((tag) => ({ tag, label: tagLabel(tag, labels) }));

  return {
    wellnessResponses: collectWellnessResponses(config, answers),
    personality: {
      primaryPersona: personaLabel(primaryKey),
      secondaryPersona: personaLabel(secondaryKey),
      personaTitle: scores?.persona?.personaTitle ?? personaLabel(primaryKey),
      fitScore: scores?.persona?.fitScore ?? 0,
      fitTier: scores?.persona?.fitTier ?? profile.fitTier,
      blendRatio: scores?.persona?.blendRatio ?? profile.blendRatio,
      blendStrength: scores?.persona?.blendStrength ?? "pure",
      primarySummary: primaryCopy?.summary ?? "",
      personaMix,
      oceanTraits,
    },
    matchedProfile: {
      goals: mapTags(profile.goals),
      barriers: mapTags(profile.barriers),
      context: mapTags(profile.context),
      exclusions: mapTags(profile.exclusions),
    },
    rankedRecommendations: selection.ranked.map((r) => serializeScoredRow(r, profile, labels)),
    selectedPlan: serializeSelectedPlan(selection, labels),
  };
}
