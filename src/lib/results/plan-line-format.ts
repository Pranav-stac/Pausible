export type PlanLineParts = {
  headline: string;
  subheadline: string | null;
};

/** First sentence only — no character truncation. */
export function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(.+?[.!?])(?:\s+|$)/);
  return match?.[1]?.trim() ?? trimmed;
}

/** Split at the first sentence boundary for bold headline + subheadline. Never adds ellipsis. */
export function splitPlanLine(text: string): PlanLineParts {
  const trimmed = text.trim();
  if (!trimmed) return { headline: "", subheadline: null };

  const sentenceEnd = trimmed.search(/[.!?](?:\s+|$)/);
  if (sentenceEnd >= 0 && sentenceEnd < trimmed.length - 1) {
    const headline = trimmed.slice(0, sentenceEnd + 1).trim();
    const rest = trimmed.slice(sentenceEnd + 1).trim();
    return {
      headline,
      subheadline: rest || null,
    };
  }

  return { headline: trimmed, subheadline: null };
}
