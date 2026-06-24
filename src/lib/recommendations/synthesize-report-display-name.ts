import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { callGeminiSection, parseSectionJson } from "@/lib/recommendations/gemini-api-client";
import { callOpenAiSection } from "@/lib/recommendations/openai-api-client";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import type { UserProfile } from "@/lib/recommendations/types";
import { formatGoalsPhrase } from "@/lib/coach-guide/format-profile-context";
import { buildDeterministicDisplayNameFromProfile } from "@/lib/results/attempt-display-name";
import { resolveParticipantFirstName } from "@/lib/results/resolve-participant-name";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";

const DISPLAY_NAME_MAX = 56;
const OPENAI_MODEL = process.env.OPENAI_REPORT_NAME_MODEL?.trim() || "gpt-5.4-mini";

type ReportDisplayNameJson = { reportDisplayName?: string };

function normalizeDisplayName(text: string | undefined, fallback: string): string {
  const cleaned = (text ?? "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 4) return fallback;
  return cleaned.length > DISPLAY_NAME_MAX ? cleaned.slice(0, DISPLAY_NAME_MAX).trim() : cleaned;
}

function deterministicFromProfile(
  profile: UserProfile,
  input: BuildProfileInput,
  persona: PersonaAnalysis | null | undefined,
): string {
  return buildDeterministicDisplayNameFromProfile({
    participantName: input.participantName,
    answers: input.answers,
    primaryPersona: profile.primaryPersona,
    personaTitle: persona?.personaTitle,
    goals: profile.goals,
  });
}

export async function synthesizeReportDisplayName(args: {
  profile: UserProfile;
  persona?: PersonaAnalysis | null;
  input: BuildProfileInput;
  llmProvider: ReportLlmProvider;
}): Promise<string> {
  const { profile, persona, input, llmProvider } = args;
  const fallback = deterministicFromProfile(profile, input, persona);
  const firstName = resolveParticipantFirstName({
    participantName: input.participantName,
    answers: input.answers,
    fallback: "",
  });
  const primaryLabel = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  const goalsPhrase = formatGoalsPhrase(profile.goals);
  const barrier = profile.barriers[0]?.replace(/^barrier_/, "").replace(/_/g, " ") ?? "not specified";

  const prompt = `Name this client's wellness report for their private history list.

Client: ${firstName || "Client"}
Primary pattern: ${primaryLabel}
Goals: ${goalsPhrase}
Main barrier: ${barrier}

Write ONE short title (3–7 words, max ${DISPLAY_NAME_MAX} characters).
- Memorable and specific to this client — not generic ("Wellness Report").
- May use first name if natural.
- No dates, no UUIDs, no "assessment" or "report" suffix.
- Coach-facing tone is fine; warm and plain.

Return JSON only:
{ "reportDisplayName": "string" }`;

  const apiKey =
    llmProvider === "gpt" ? process.env.OPENAI_API_KEY?.trim() : process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const callArgs = {
    apiKey,
    model:
      llmProvider === "gpt"
        ? OPENAI_MODEL
        : process.env.GEMINI_REPORT_NAME_MODEL?.trim() ||
          process.env.GEMINI_MODEL?.trim() ||
          "gemini-3.5-flash",
    systemPrompt: "You label wellness reports with short, human titles. Return valid JSON only.",
    userPrompt: prompt,
    json: true,
    maxOutputTokens: 120,
  };

  const result =
    llmProvider === "gpt" ? await callOpenAiSection(callArgs) : await callGeminiSection(callArgs);
  const parsed = parseSectionJson<ReportDisplayNameJson>(result.text);
  return normalizeDisplayName(parsed?.reportDisplayName, fallback);
}
