import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { callGeminiSection, parseSectionJson } from "@/lib/recommendations/gemini-api-client";
import { callOpenAiSection } from "@/lib/recommendations/openai-api-client";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";
import type { IntegratedPlanSynthesis, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { buildCoachGuideDocumentDeterministic } from "@/lib/coach-guide/build-coach-guide";
import {
  buildCoachGuidePage2Prompt,
  buildCoachGuidePage3Prompt,
  type CoachGuidePage2PromptJson,
  type CoachGuidePage3PromptJson,
  COACH_GUIDE_SYSTEM_PROMPT,
} from "@/lib/coach-guide/coach-guide-prompts";
import type { CoachGuideDocument } from "@/lib/coach-guide/types";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";

const COACH_GUIDE_OPENAI_MODEL = process.env.OPENAI_COACH_GUIDE_MODEL?.trim() || "gpt-5.4-mini";

function normalizeBullets(items: string[] | undefined, fallback: string[], max: number): string[] {
  const cleaned = (items ?? []).map((s) => s.trim()).filter(Boolean).slice(0, max);
  return cleaned.length ? cleaned : fallback;
}

function normalizeValidationCheck(
  raw: CoachGuidePage3PromptJson["validationCheck"],
  fallback: [string, string, string],
): [string, string, string] {
  if (!raw || !Array.isArray(raw)) return fallback;
  const lines = raw.map((s) => s.trim()).filter(Boolean);
  if (lines.length < 3) return fallback;
  return [lines[0], lines[1], lines[2]];
}

function applyTraitNarratives(
  doc: CoachGuideDocument,
  narratives: CoachGuidePage2PromptJson["traitDeviationNarratives"],
): void {
  if (!narratives?.length) return;
  const byTrait = new Map(narratives.map((n) => [n.trait.trim().toLowerCase(), n.narrative.trim()]));
  for (const row of doc.introduction.traits) {
    if (!row.deviation) continue;
    const hit = byTrait.get(row.trait.toLowerCase());
    if (hit) row.meaning = hit;
  }
}

function mergeCoachGuideSynthesis(
  base: CoachGuideDocument,
  page2: CoachGuidePage2PromptJson | null,
  page3: CoachGuidePage3PromptJson | null,
  synthesized: boolean,
  synthesisError?: string | null,
): CoachGuideDocument {
  const merged: CoachGuideDocument = {
    ...base,
    introduction: {
      ...base.introduction,
      personaDescription:
        page2?.personaDescription?.trim() || base.introduction.personaDescription,
      secondaryInfluence:
        page2?.secondaryInfluence?.trim() || base.introduction.secondaryInfluence,
      motivates: normalizeBullets(page2?.motivates, base.introduction.motivates, 3),
      drains: normalizeBullets(page2?.drains, base.introduction.drains, 3),
      traits: base.introduction.traits.map((row) => ({ ...row })),
    },
    guidingPrinciples: {
      ...base.guidingPrinciples,
      validationCheck: normalizeValidationCheck(
        page3?.validationCheck,
        base.guidingPrinciples.validationCheck,
      ),
      pivotTriggers: normalizeBullets(
        page3?.pivotTriggers,
        base.guidingPrinciples.pivotTriggers,
        4,
      ),
    },
    synthesized,
    synthesisError: synthesisError ?? null,
  };

  applyTraitNarratives(merged, page2?.traitDeviationNarratives);
  return merged;
}

async function callCoachGuideSection(
  provider: ReportLlmProvider,
  userPrompt: string,
  maxOutputTokens: number,
): Promise<{ text: string; error?: string }> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = provider === "gpt" ? openaiKey : geminiKey;

  if (!apiKey) {
    return { text: "", error: "LLM API key not configured" };
  }

  const callArgs = {
    apiKey,
    model:
      provider === "gpt"
        ? COACH_GUIDE_OPENAI_MODEL
        : process.env.GEMINI_COACH_GUIDE_MODEL?.trim() ||
          process.env.GEMINI_MODEL?.trim() ||
          "gemini-3.5-flash",
    systemPrompt: COACH_GUIDE_SYSTEM_PROMPT,
    userPrompt,
    json: true,
    maxOutputTokens,
  };

  const result =
    provider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);
  return { text: result.text, error: result.error };
}

export async function synthesizeCoachGuideDocument(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  input?: BuildProfileInput;
  reportId: string;
  llmProvider: ReportLlmProvider;
  planOutput?: PlanOutput | null;
  integratedPlan?: IntegratedPlanSynthesis | null;
}): Promise<CoachGuideDocument> {
  const base = buildCoachGuideDocumentDeterministic(args);
  const firstName = base.clientName;

  const page2Prompt = buildCoachGuidePage2Prompt({
    profile: args.profile,
    persona: args.persona,
    firstName,
  });
  const page3Prompt = buildCoachGuidePage3Prompt({
    profile: args.profile,
    persona: args.persona,
    firstName,
    input: args.input,
    planOutput: args.planOutput,
    integratedPlan: args.integratedPlan,
  });

  const [page2Result, page3Result] = await Promise.all([
    callCoachGuideSection(args.llmProvider, page2Prompt, SECTION_OUTPUT_TOKENS.coachGuidePage2),
    callCoachGuideSection(args.llmProvider, page3Prompt, SECTION_OUTPUT_TOKENS.coachGuidePage3),
  ]);

  let page2Json = parseSectionJson<CoachGuidePage2PromptJson>(page2Result.text);
  let page3Json = parseSectionJson<CoachGuidePage3PromptJson>(page3Result.text);

  const errors: string[] = [];
  if (page2Result.error) errors.push(`page2: ${page2Result.error}`);
  if (page3Result.error) errors.push(`page3: ${page3Result.error}`);
  if (!page2Json && page2Result.text.trim()) errors.push("page2: invalid JSON");
  if (!page3Json && page3Result.text.trim()) errors.push("page3: invalid JSON");

  if (!page2Json && !page2Result.error) {
    const retry = await callCoachGuideSection(
      args.llmProvider,
      page2Prompt,
      SECTION_OUTPUT_TOKENS.coachGuidePage2,
    );
    page2Json = parseSectionJson<CoachGuidePage2PromptJson>(retry.text);
    if (!page2Json && retry.text.trim()) errors.push("page2: retry invalid JSON");
  }

  if (!page3Json && !page3Result.error) {
    const retry = await callCoachGuideSection(
      args.llmProvider,
      page3Prompt,
      SECTION_OUTPUT_TOKENS.coachGuidePage3,
    );
    page3Json = parseSectionJson<CoachGuidePage3PromptJson>(retry.text);
    if (!page3Json && retry.text.trim()) errors.push("page3: retry invalid JSON");
  }

  const llmSucceeded = Boolean(
    page2Json?.personaDescription?.trim() ||
      page2Json?.motivates?.length ||
      page3Json?.validationCheck?.length ||
      page3Json?.pivotTriggers?.length,
  );

  if (!llmSucceeded && !errors.length) {
    errors.push("coach guide LLM returned empty content");
  }

  return mergeCoachGuideSynthesis(
    base,
    page2Json,
    page3Json,
    llmSucceeded,
    errors.length ? errors.join("; ") : null,
  );
}
