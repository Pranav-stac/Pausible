import { PERSONA_KEY_TO_ALIAS } from "@/lib/recommendations/persona-aliases";
import { isPiSeries } from "@/lib/recommendations/action-pool";
import { scanTextForBlocklist, scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";
import type { ActionPlanSelection, RecommendationRow, ScoredRecommendation } from "@/lib/recommendations/types";
import type { AttemptAnswers, AttemptScores } from "@/types/models";
import { activeQuestionBank } from "@/lib/scoring/question-bank-meta";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";
import { personaAnimal } from "@/lib/results/persona-display";

const PI_TYPES = ["blind_spot", "pattern_prediction", "success_condition", "strength_insight"] as const;

export type PreGenerationGateResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type PostSynthesisResult = {
  ok: boolean;
  violations: string[];
  warnings: string[];
  useFallback: boolean;
};

const BLIND_SPOT_CRITICAL_TERMS = [
  "blind spot",
  "weakness",
  "flaw",
  "deficiency",
  "limitation",
  "your problem",
  "you fail",
] as const;

/** §26.1 — PI completeness per persona on loaded master. */
export function validatePersonaFillability(rows: RecommendationRow[]): string[] {
  const errors: string[] = [];

  for (const persona of PERSONA_KEYS) {
    const alias = PERSONA_KEY_TO_ALIAS[persona];
    for (const type of PI_TYPES) {
      const hit = rows.find(
        (r) =>
          isPiSeries(r) &&
          r.type === type &&
          r.personaFit.map((p) => p.toLowerCase()).includes(alias),
      );
      if (!hit) errors.push(`Fillability: missing PI ${type} for ${persona}`);
    }
  }

  return errors;
}

/** PDA §26.1 — block report when failed. */
export function validatePreGeneration(args: {
  answers: AttemptAnswers;
  scores: AttemptScores | null | undefined;
  ranked: ScoredRecommendation[];
  selection: ActionPlanSelection;
  masterRows?: RecommendationRow[];
}): PreGenerationGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const bank = activeQuestionBank();
  const answeredOcean = bank.filter((q) => typeof args.answers[q.code] === "number").length;
  if (answeredOcean < 90) {
    errors.push(`OCEAN incomplete: ${answeredOcean}/90 items answered`);
  }

  const persona = args.scores?.persona;
  if (!persona?.primaryPersona || !persona?.secondaryPersona) {
    errors.push("Primary and secondary persona must be computed");
  }

  const scoredPositive = args.ranked.filter((r) => r.score.total > 0 && !isPiSeries(r)).length;
  if (scoredPositive < 50) {
    warnings.push(`Only ${scoredPositive} recommendations scored above 0 (expected ≥50)`);
  }

  if (!args.selection.piSeries.complete) {
    errors.push("PI series incomplete for primary persona (missing blind_spot/pattern_prediction/success_condition/strength_insight)");
  } else {
    for (const type of PI_TYPES) {
      const hit = args.ranked.find(
        (r) =>
          isPiSeries(r) &&
          r.type === type &&
          r.personaFit.map((p) => p.toLowerCase()).includes(args.selection.profile.primaryPersonaAlias),
      );
      if (!hit) errors.push(`Missing PI type for primary persona: ${type}`);
    }
  }

  if (args.masterRows?.length) {
    const fillErrors = validatePersonaFillability(args.masterRows);
    if (fillErrors.length) {
      warnings.push(`Fillability check: ${fillErrors.length} gaps in master (v1.13 expected pass)`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateSynthesisText(text: string, field: string): string[] {
  return scanTextForBlocklist(text, field).map((v) => `${v.field}: forbidden term "${v.term}"`);
}

function scrubOptional(text: string | undefined): string | undefined {
  if (!text?.trim()) return text;
  return scrubBlocklistTerms(text);
}

function scrubList(items: string[] | undefined): string[] | undefined {
  if (!items?.length) return items;
  return items.map((t) => scrubBlocklistTerms(t));
}

/** Scrub blocklisted phrases from synthesis sections before validation and display (PDA §25). */
export function sanitizePostSynthesisInput<T extends Parameters<typeof validatePostSynthesis>[0]>(sections: T): T {
  return {
    ...sections,
    primaryNarrative: scrubOptional(sections.primaryNarrative),
    secondaryNarrative: scrubOptional(sections.secondaryNarrative),
    blindPattern: scrubOptional(sections.blindPattern),
    blindGoals: scrubOptional(sections.blindGoals),
    pillarFocus: scrubList(sections.pillarFocus),
    pillarDos: scrubList(sections.pillarDos),
    pillarDonts: scrubList(sections.pillarDonts),
    priorityHeadlines: scrubList(sections.priorityHeadlines),
    priorityBodies: scrubList(sections.priorityBodies),
    planSubtitle: scrubOptional(sections.planSubtitle),
    planBuiltNarrative: scrubOptional(sections.planBuiltNarrative),
    planPhaseIntents: scrubList(sections.planPhaseIntents),
    planReadinessSignals: scrubList(sections.planReadinessSignals),
    behaviouralBoxBodies: scrubList(sections.behaviouralBoxBodies),
  };
}

function isCriticalViolation(violation: string): boolean {
  if (violation.includes("forbidden term")) return false;
  if (violation.includes("word count")) return false;
  return true;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasDuplicateSentence(texts: string[]): string | null {
  const normalized = texts
    .flatMap((t) => t.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 20);
  const seen = new Set<string>();
  for (const sentence of normalized) {
    if (seen.has(sentence)) return sentence;
    seen.add(sentence);
  }
  return null;
}

const ANIMAL_NAME_PATTERN =
  /\b(turtle|deer|fox|wolf|bear|elephant|shielded turtle|watchful deer|curious fox|pack wolf|steadfast bear|steady elephant)\b/i;

function checkEmotionalArc(sections: {
  primaryNarrative?: string;
  blindPattern?: string;
  blindGoals?: string;
}): string[] {
  const warnings: string[] = [];

  if (sections.primaryNarrative) {
    const lower = sections.primaryNarrative.toLowerCase();
    if (!/\b(you|your)\b/.test(lower)) {
      warnings.push("emotional_arc: primary_pattern lacks second-person voice (P4 — deep understanding)");
    }
  }

  if (sections.blindPattern) {
    const lower = sections.blindPattern.toLowerCase();
    for (const term of BLIND_SPOT_CRITICAL_TERMS) {
      if (lower.includes(term)) {
        warnings.push(
          `emotional_arc: blind_spots.pattern uses critical tone "${term}" (P6 should feel revelatory, not critical)`,
        );
      }
    }
  }

  if (sections.blindGoals && !sections.blindGoals.trim().match(/\b(when|next|forward|build|start)\b/i)) {
    warnings.push("emotional_arc: blind_spots.goals may lack forward-looking close (P6 — revelation → goals)");
  }

  return warnings;
}

function checkRecIdTraceability(args: {
  pillarSourceIds?: string[][];
  piSourceIds?: string[];
}): string[] {
  const warnings: string[] = [];
  const pillarIds = args.pillarSourceIds ?? [];
  const emptyPillars = pillarIds.filter((ids) => !ids.length).length;
  if (emptyPillars > 0) {
    warnings.push(
      `traceability: ${emptyPillars} pillar section(s) missing source rec IDs (§26.2 audit)`,
    );
  }
  if (!args.piSourceIds?.length) {
    warnings.push("traceability: PI narrative source rec IDs missing (§26.2 audit)");
  }
  return warnings;
}

/** PDA §26.2 — post-generation validation; triggers fallback when failed. */
export function validatePostSynthesis(sections: {
  primaryNarrative?: string;
  secondaryNarrative?: string;
  blindPattern?: string;
  blindGoals?: string;
  pillarFocus?: string[];
  pillarDos?: string[];
  pillarDonts?: string[];
  priorityHeadlines?: string[];
  priorityBodies?: string[];
  planSubtitle?: string;
  planBuiltNarrative?: string;
  planPhaseIntents?: string[];
  planReadinessSignals?: string[];
  behaviouralBoxBodies?: string[];
  primaryPersonaKey?: PersonaKey | null;
  pillarSourceIds?: string[][];
  piSourceIds?: string[];
}): PostSynthesisResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  const scan = (text: string | undefined, field: string) => {
    if (!text?.trim()) return;
    violations.push(...validateSynthesisText(text, field));
  };

  scan(sections.primaryNarrative, "primary_pattern");
  scan(sections.secondaryNarrative, "secondary_pattern");
  scan(sections.blindPattern, "blind_spots.pattern");
  scan(sections.blindGoals, "blind_spots.goals");
  for (const [i, t] of (sections.pillarFocus ?? []).entries()) scan(t, `pillar[${i}].headline`);
  for (const [i, t] of (sections.pillarDos ?? []).entries()) scan(t, `pillar_do[${i}]`);
  for (const [i, t] of (sections.pillarDonts ?? []).entries()) scan(t, `pillar_dont[${i}]`);
  for (const [i, t] of (sections.priorityHeadlines ?? []).entries()) scan(t, `priority[${i}].headline`);
  for (const [i, t] of (sections.priorityBodies ?? []).entries()) scan(t, `priority[${i}].body`);
  scan(sections.planSubtitle, "plan_page.subtitle");
  scan(sections.planBuiltNarrative, "plan_page.rationale");
  for (const [i, t] of (sections.planPhaseIntents ?? []).entries()) scan(t, `plan_page.phase[${i}].intent`);
  for (const [i, t] of (sections.planReadinessSignals ?? []).entries()) scan(t, `plan_page.phase[${i}].readiness`);

  for (const [i, body] of (sections.behaviouralBoxBodies ?? []).entries()) {
    if (body && ANIMAL_NAME_PATTERN.test(body)) {
      const animal = sections.primaryPersonaKey ? personaAnimal(sections.primaryPersonaKey)?.name : null;
      if (!animal || !body.toLowerCase().includes(animal.toLowerCase())) {
        violations.push(`behavioural_box[${i}]: animal name in deep behavioural prose`);
      }
    }
    scan(body, `behavioural_box[${i}]`);
  }

  if (sections.primaryNarrative) {
    const wc = wordCount(sections.primaryNarrative);
    if (wc < 140 || wc > 210) {
      warnings.push(`primary_pattern: word count ${wc} outside 150-200w range (§20.4)`);
    }
  }

  if (sections.blindPattern) {
    const wc = wordCount(sections.blindPattern);
    if (wc < 60 || wc > 120) warnings.push(`blind_spots.pattern: word count ${wc} outside 80-100w range`);
  }
  if (sections.blindGoals) {
    const wc = wordCount(sections.blindGoals);
    if (wc < 45 || wc > 100) warnings.push(`blind_spots.goals: word count ${wc} outside 60-80w range`);
  }

  const allProse = [
    sections.primaryNarrative,
    sections.secondaryNarrative,
    sections.blindPattern,
    sections.blindGoals,
    ...(sections.pillarFocus ?? []),
    ...(sections.priorityBodies ?? []),
    ...(sections.behaviouralBoxBodies ?? []),
  ].filter(Boolean) as string[];

  const dup = hasDuplicateSentence(allProse);
  // Duplicates can happen even in good reports (e.g. deliberate refrains).
  // Treat as a warning so we don't drop synthesis quality via fallback.
  if (dup) warnings.push(`duplicate sentence across sections: "${dup.slice(0, 60)}…"`);

  warnings.push(
    ...checkEmotionalArc({
      primaryNarrative: sections.primaryNarrative,
      blindPattern: sections.blindPattern,
      blindGoals: sections.blindGoals,
    }),
  );
  warnings.push(
    ...checkRecIdTraceability({
      pillarSourceIds: sections.pillarSourceIds,
      piSourceIds: sections.piSourceIds,
    }),
  );

  return {
    ok: violations.length === 0,
    violations,
    warnings,
    useFallback: violations.some(isCriticalViolation),
  };
}
