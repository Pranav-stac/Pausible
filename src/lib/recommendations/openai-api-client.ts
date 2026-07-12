import type { GeminiTokenUsage } from "@/lib/recommendations/types";
import { parseSectionJson } from "@/lib/recommendations/gemini-api-client";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";

export type OpenAiSectionResult = {
  text: string;
  tokenUsage: GeminiTokenUsage | null;
  error?: string;
};

function shouldUseResponsesApi(model: string): boolean {
  const m = model.toLowerCase();
  return m.startsWith("gpt-5") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4");
}

function extractResponsesOutputText(data: {
  output_text?: string;
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
}): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }

  for (const item of data.output ?? []) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }

  return "";
}

function parseResponsesUsage(
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
        total_tokens?: number;
      }
    | undefined,
  model: string,
): GeminiTokenUsage | null {
  if (!usage) return null;
  const promptTokens = usage.input_tokens ?? 0;
  const completionTokens = usage.output_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;
  if (totalTokens === 0 && promptTokens === 0 && completionTokens === 0) return null;
  return { model, promptTokens, completionTokens, totalTokens };
}

async function callOpenAiResponses(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<OpenAiSectionResult> {
  const body: Record<string, unknown> = {
    model: args.model,
    instructions: args.systemPrompt,
    input: args.userPrompt,
    max_output_tokens: args.maxOutputTokens ?? SECTION_OUTPUT_TOKENS.default,
    store: false,
  };

  if (args.json) {
    body.text = { format: { type: "json_object" } };
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return {
      text: "",
      tokenUsage: null,
      error: `OpenAI Responses HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`,
    };
  }

  const data = (await res.json()) as {
    output_text?: string;
    output?: { type?: string; content?: { type?: string; text?: string }[] }[];
    usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
    error?: { message?: string };
  };

  if (data.error?.message) {
    return { text: "", tokenUsage: null, error: `OpenAI Responses: ${data.error.message}` };
  }

  const text = extractResponsesOutputText(data);
  const tokenUsage = parseResponsesUsage(data.usage, args.model);

  if (!text.trim()) {
    return { text: "", tokenUsage, error: "OpenAI Responses returned empty content" };
  }

  return { text, tokenUsage };
}

function buildChatCompletionBody(
  args: { model: string; systemPrompt: string; userPrompt: string; json?: boolean; maxOutputTokens?: number },
  tokenField: "max_tokens" | "max_completion_tokens",
): Record<string, unknown> {
  return {
    model: args.model,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content: args.userPrompt },
    ],
    temperature: 0.7,
    [tokenField]: args.maxOutputTokens ?? SECTION_OUTPUT_TOKENS.default,
    ...(args.json ? { response_format: { type: "json_object" } } : {}),
  };
}

async function callOpenAiChatCompletions(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<OpenAiSectionResult> {
  const primaryField = shouldUseResponsesApi(args.model) ? "max_completion_tokens" : "max_tokens";
  const bodies = shouldUseResponsesApi(args.model)
    ? [buildChatCompletionBody(args, "max_completion_tokens")]
    : [
        buildChatCompletionBody(args, primaryField),
        buildChatCompletionBody(args, "max_completion_tokens"),
      ];

  let lastError = "OpenAI Chat Completions request failed";

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
      lastError = `OpenAI Chat HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`;
      continue;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
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
      lastError = "OpenAI Chat returned empty content";
      continue;
    }

    return { text, tokenUsage };
  }

  return { text: "", tokenUsage: null, error: lastError };
}

export async function callOpenAiSection(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  json?: boolean;
  maxOutputTokens?: number;
}): Promise<OpenAiSectionResult> {
  if (!args.userPrompt.trim()) {
    return { text: "", tokenUsage: null, error: "Empty section prompt" };
  }

  try {
    if (shouldUseResponsesApi(args.model)) {
      const responsesResult = await callOpenAiResponses(args);
      if (!responsesResult.error) return responsesResult;
      const chatResult = await callOpenAiChatCompletions(args);
      if (!chatResult.error) return chatResult;
      return {
        text: "",
        tokenUsage: null,
        error: `${responsesResult.error}; fallback: ${chatResult.error}`,
      };
    }

    return await callOpenAiChatCompletions(args);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { text: "", tokenUsage: null, error: `OpenAI error: ${msg}` };
  }
}

export { parseSectionJson };
