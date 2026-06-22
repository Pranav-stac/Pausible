import type { PillarSynthesisDo, PillarSynthesisDont } from "@/lib/recommendations/types";

type DontLike = PillarSynthesisDont & { behaviour?: string; action?: string };

export function normalizePillarDo(item: PillarSynthesisDo | string): PillarSynthesisDo {
  if (typeof item === "string") return { action: item, why: "" };
  return item;
}

export function normalizePillarDont(item: PillarSynthesisDont | string): PillarSynthesisDont {
  if (typeof item === "string") return { behavior: item, why: "" };
  const raw = item as DontLike;
  const behavior =
    raw.behavior?.trim() || raw.behaviour?.trim() || raw.action?.trim() || "";
  return {
    behavior,
    why: raw.why?.trim() ?? "",
  };
}

export function formatPillarDoLine(item: PillarSynthesisDo | string): string {
  const row = normalizePillarDo(item);
  return row.why?.trim() ? `${row.action} — ${row.why}` : row.action;
}

export function formatPillarDontLine(item: PillarSynthesisDont | string): string {
  const row = normalizePillarDont(item);
  return row.why?.trim() ? `${row.behavior} — ${row.why}` : row.behavior;
}
