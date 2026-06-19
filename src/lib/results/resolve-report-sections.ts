import { buildWellnessHighlights } from "@/lib/results/build-results-report";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import type { DualSection } from "@/lib/results/report-section-split";
import { splitDualSection } from "@/lib/results/report-section-split";
import type { ActionPlanSynthesis, WellnessReportSections } from "@/lib/recommendations/types";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { isWellnessContextAnswerKey } from "@/data/wellness-context-questionnaire";

function wellnessGoalsBarrierText(attempt: SerializedAttempt): { goals: string | null; barrier: string | null } {
  const answers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attempt.answers ?? {})) {
    if (isWellnessContextAnswerKey(k)) answers[k] = v;
  }
  const highlights = buildWellnessHighlights(answers);
  const goals = highlights.find((h) => h.prompt.toLowerCase().includes("goal"))?.answer ?? null;
  const barrier = highlights.find((h) => h.prompt.toLowerCase().includes("barrier"))?.answer ?? null;
  return { goals, barrier };
}

function goalsFallbackFromAttempt(attempt: SerializedAttempt): string {
  const { goals, barrier } = wellnessGoalsBarrierText(attempt);
  if (goals && barrier) {
    return `This pattern intersects with your goal to ${goals.toLowerCase()} — and your barrier (${barrier.toLowerCase()}) may feel harder to break because of it. Seeing the link is the first step to working around it.`;
  }
  if (goals) {
    return `This background pattern may explain why ${goals.toLowerCase()} has felt inconsistent — not from lack of intent, but from a habit loop you had not named yet.`;
  }
  if (barrier) {
    return `Your barrier (${barrier.toLowerCase()}) often worsens when this pattern runs unchecked. Address the pattern and the barrier loosens.`;
  }
  return "This hidden loop may be undermining the wellness goals you care about most — even when effort and intent are high.";
}

export function resolveBlindSpotColumns(
  sections: WellnessReportSections | undefined,
  synthesis: ActionPlanSynthesis | undefined,
  attempt: SerializedAttempt,
): DualSection {
  const bs = sections?.blindSpots;
  if (bs?.patternBody?.trim() || bs?.goalsBody?.trim()) {
    return {
      left: { title: "The pattern you don't notice", body: bs.patternBody?.trim() ?? "" },
      right: {
        title: "What this means for your goals",
        body: bs.goalsBody?.trim() || goalsFallbackFromAttempt(attempt),
      },
    };
  }

  const legacy = splitDualSection(
    bs?.body?.trim() ?? "",
    "The pattern you don't notice",
    "What this means for your goals",
    bs?.heading,
  );

  if (!legacy.right.body.trim()) {
    legacy.right.body = goalsFallbackFromAttempt(attempt);
  }
  if (!legacy.left.body.trim() && synthesis?.reportSections?.primaryPattern?.behaviouralBoxes?.[2]?.content) {
    legacy.left.body = synthesis.reportSections.primaryPattern.behaviouralBoxes[2].content;
  }
  return legacy;
}

export function resolveSuccessBlueprintColumns(
  sections: WellnessReportSections | undefined,
  synthesis: ActionPlanSynthesis | undefined,
  _model: ResultsReportModel,
): DualSection {
  const sb = sections?.successBlueprint;
  if (sb?.worksBody?.trim() || sb?.advantageBody?.trim()) {
    return {
      left: { title: "What works for you", body: sb.worksBody?.trim() ?? "" },
      right: {
        title: "Your natural advantage",
        body: sb.advantageBody?.trim() || synthesis?.coachNotes.keyStrength || "",
      },
    };
  }

  const legacy = splitDualSection(
    sb?.body?.trim() ?? "",
    "What works for you",
    "Your natural advantage",
    sb?.heading,
  );

  if (!legacy.right.body.trim() && synthesis?.reportSections?.primaryPattern?.personaNarrative) {
    legacy.right.body = synthesis.reportSections.primaryPattern.personaNarrative;
  }
  return legacy;
}
