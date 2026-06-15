import type { GeminiTokenUsage } from "@/lib/recommendations/types";
import { parseSectionJson } from "@/lib/recommendations/gemini-api-client";

const SECTION_MAX_OUTPUT_TOKENS = 500;

export type OpenAiSectionResult = {
  text: string;
  tokenUsage: GeminiTokenUsage | null;
  error?: string;
};

function usesMaxCompletionTokens(model: string): boolean {
  const m = model.toLowerCase();
  return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4");
}

function buildOpenAiBody(
  args: { model: string; systemPrompt: string; userPrompt: string; json?: boolean },
  tokenField: "max_tokens" | "max_completion_tokens",
): Record<string, unknown> {
  return {
    model: args.model,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ],
    temperature: 0.7,
    [tokenField]: SECTION_MAX_OUTPUT_TOKENS,
    ...(args.json ? { response_format: { type: "json_object" } } : {}),
  };
}

export async function callOpenAiSection(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json?: boolean;
}): Promise<OpenAiSectionResult> {
  if (!args.userPrompt.trim()) {
    return { text: "", tokenUsage: null, error: "Empty section prompt" };
  }

  const primaryField = usesMaxCompletionTokens(args.model) ? "max_completion_tokens" : "max_tokens";
  const fallbackField = primaryField === "max_tokens" ? "max_completion_tokens" : "max_tokens";
  const bodies = [
    buildOpenAiBody(args, primaryField),
    buildOpenAiBody(args, fallbackField),
  ];

  try {
    let lastError = "OpenAI request failed";

    for (const body of bodies) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        lastError = `OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
        continue;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      const text = data.choices?.[0]?.message?.content ?? "";
      const usage = data.usage;
      const promptTokens = usage?.prompt_tokens ?? 0;
      const completionTokens = usage?.completion_tokens ?? 0;
      const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
      const tokenUsage =
        totalTokens > 0 || promptTokens > 0 || completionTokens > 0
          ? { model: args.model, promptTokens, completionTokens, totalTokens }
          : null;

      if (!text.trim()) {
        lastError = "OpenAI returned empty content";
        continue;
      }

      return { text, tokenUsage };
    }

    return { text: "", tokenUsage: null, error: lastError };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { text: "", tokenUsage: null, error: `OpenAI error: ${msg}` };
  }
}

export { parseSectionJson };
