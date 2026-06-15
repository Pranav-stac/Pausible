import type { GeminiTokenUsage } from "@/lib/recommendations/types";
import { parseSectionJson } from "@/lib/recommendations/gemini-api-client";

const SECTION_MAX_OUTPUT_TOKENS = 500;

export type OpenAiSectionResult = {
  text: string;
  tokenUsage: GeminiTokenUsage | null;
  error?: string;
};

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

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [
          { role: "system", content: args.systemPrompt },
          { role: "user", content: args.userPrompt },
        ],
        temperature: 0.7,
        max_tokens: SECTION_MAX_OUTPUT_TOKENS,
        ...(args.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { text: "", tokenUsage: null, error: `OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}` };
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
      return { text: "", tokenUsage, error: "OpenAI returned empty content" };
    }

    return { text, tokenUsage };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { text: "", tokenUsage: null, error: `OpenAI error: ${msg}` };
  }
}

export { parseSectionJson };
