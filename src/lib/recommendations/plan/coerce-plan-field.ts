/** Coerce LLM JSON plan fields to plain strings (arrays/objects must not crash .trim()). */

export function coercePlanText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => coercePlanText(item, ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    return joined || fallback;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["text", "content", "description", "value", "phase_intent_user"]) {
      if (key in record) {
        const nested = coercePlanText(record[key], "");
        if (nested) return nested;
      }
    }
  }
  return fallback;
}

export function coerceOptionalPlanText(value: unknown): string | undefined {
  const text = coercePlanText(value, "");
  return text || undefined;
}
