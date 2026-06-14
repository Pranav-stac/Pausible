import type { PillarSynthesisDo, PillarSynthesisDont } from "@/lib/recommendations/types";

export function normalizePillarDo(item: PillarSynthesisDo | string): PillarSynthesisDo {
  if (typeof item === "string") return { action: item, why: "" };
  return item;
}

export function normalizePillarDont(item: PillarSynthesisDont | string): PillarSynthesisDont {
  if (typeof item === "string") return { behavior: item, why: "" };
  return item;
}

export function formatPillarDoLine(item: PillarSynthesisDo | string): string {
  const row = normalizePillarDo(item);
  return row.why?.trim() ? `${row.action} — ${row.why}` : row.action;
}

export function formatPillarDontLine(item: PillarSynthesisDont | string): string {
  const row = normalizePillarDont(item);
  return row.why?.trim() ? `${row.behavior} — ${row.why}` : row.behavior;
}
