import { PERSONA_ANIMAL, PERSONA_DISPLAY, personaImagePath } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis, PersonaKey } from "@/lib/scoring/persona-types";
import type { AttemptScores } from "@/types/models";
import { personaCatalogEntry } from "@/lib/data/persona-catalog-client";

export function personaLabel(key?: string | null): string {
  if (!key) return "Your profile";
  const k = key as PersonaKey;
  return personaCatalogEntry(k)?.label ?? PERSONA_DISPLAY[k]?.label ?? key.replace(/_/g, " ");
}

export function personaCopy(key?: string | null) {
  if (!key) return null;
  const cat = personaCatalogEntry(key);
  if (cat) {
    return { label: cat.label, archetype: cat.archetype, summary: cat.summary, bullets: cat.bullets };
  }
  return PERSONA_DISPLAY[key as PersonaKey] ?? null;
}

export function personaAnimal(key?: string | null) {
  if (!key) return null;
  const k = key as PersonaKey;
  const canonical = PERSONA_ANIMAL[k];
  if (!canonical) return null;
  const cat = personaCatalogEntry(key);
  if (cat) {
    // Labels/copy may be overridden in admin catalog; images must stay tied to persona key.
    return {
      name: cat.animalName?.trim() || canonical.name,
      emoji: cat.emoji?.trim() || canonical.emoji,
      imagePath: personaImagePath(k),
    };
  }
  return canonical;
}

export function personaFromScores(scores?: AttemptScores | null): PersonaAnalysis | null {
  return scores?.persona ?? null;
}

export function traitMeterPercent(traitAvg: number, min = 1, max = 7): number {
  const span = Math.max(1e-6, max - min);
  const clipped = Math.min(max, Math.max(min, traitAvg));
  return Math.round(((clipped - min) / span) * 100);
}
