import { PERSONA_ANIMAL, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis, PersonaKey } from "@/lib/scoring/persona-types";
import type { AttemptScores } from "@/types/models";

export function personaLabel(key?: string | null): string {
  if (!key) return "Your profile";
  const k = key as PersonaKey;
  return PERSONA_DISPLAY[k]?.label ?? key.replace(/_/g, " ");
}

export function personaCopy(key?: string | null) {
  if (!key) return null;
  return PERSONA_DISPLAY[key as PersonaKey] ?? null;
}

export function personaAnimal(key?: string | null) {
  if (!key) return null;
  return PERSONA_ANIMAL[key as PersonaKey] ?? null;
}

export function personaFromScores(scores?: AttemptScores | null): PersonaAnalysis | null {
  return scores?.persona ?? null;
}

export function traitMeterPercent(traitAvg: number, min = 1, max = 7): number {
  const span = Math.max(1e-6, max - min);
  const clipped = Math.min(max, Math.max(min, traitAvg));
  return Math.round(((clipped - min) / span) * 100);
}
