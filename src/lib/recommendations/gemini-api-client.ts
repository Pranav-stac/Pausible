import type { GeminiTokenUsage } from "@/lib/recommendations/types";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";

export type GeminiSectionResult = {
  text: string;
  tokenUsage: GeminiTokenUsage | null;
  error?: string;
};

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

function parseGeminiTokenUsage(
  usage:
    | {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      }
    | undefined,
  model: string,
): GeminiTokenUsage | null {
  if (!usage) return null;
  const promptTokens = usage.promptTokenCount ?? 0;
  const completionTokens = usage.candidatesTokenCount ?? 0;
  const totalTokens = usage.totalTokenCount ?? promptTokens + completionTokens;
  if (totalTokens === 0 && promptTokens === 0 && completionTokens === 0) return null;
  return { model, promptTokens, completionTokens, totalTokens };
}

export function mergeTokenUsage(
  parts: (GeminiTokenUsage | null | undefined)[],
  model: string,
): GeminiTokenUsage | null {
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let any = false;

  for (const part of parts) {
    if (!part) continue;
    any = true;
    promptTokens += part.promptTokens;
    completionTokens += part.completionTokens;
    totalTokens += part.totalTokens;
  }

  if (!any) return null;
  return { model, promptTokens, completionTokens, totalTokens };
}

export async function callGeminiSection(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<GeminiSectionResult> {
  if (!args.userPrompt.trim()) {
    return { text: "", tokenUsage: null, error: "Empty section prompt" };
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: args.userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: args.maxOutputTokens ?? SECTION_OUTPUT_TOKENS.default,
            ...(args.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      return { text: "", tokenUsage: null, error: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tokenUsage = parseGeminiTokenUsage(data.usageMetadata, args.model);

    if (!text.trim()) {
      return { text: "", tokenUsage, error: "Gemini returned empty content" };
    }

    return { text, tokenUsage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { text: "", tokenUsage: null, error: `Gemini error: ${msg}` };
  }
}

export function parseSectionJson<T>(text: string): T | null {
  try {
    return parseGeminiJson(text) as T;
  } catch {
    return null;
  }
}
