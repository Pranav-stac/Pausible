export type ReportLlmProvider = "gemini" | "gpt";

export const DEFAULT_REPORT_LLM_PROVIDER: ReportLlmProvider = "gemini";

export function parseReportLlmProvider(value: unknown): ReportLlmProvider {
  return value === "gpt" ? "gpt" : "gemini";
}

export function reportLlmModel(provider: ReportLlmProvider): string {
  if (provider === "gpt") {
    return process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
  }
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

export function reportLlmProviderLabel(provider: ReportLlmProvider): string {
  return provider === "gpt" ? "OpenAI GPT" : "Google Gemini";
}
