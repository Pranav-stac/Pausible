import type { PillarSynthesisDo, PillarSynthesisDont } from "@/lib/recommendations/types";

type DontLike = PillarSynthesisDont & { behaviour?: string; action?: string };

export function normalizePillarDo(item: PillarSynthesisDo | string): PillarSynthesisDo {
  if (typeof item === "string") return { action: item, why: "", example: null };
  const exampleRaw = item.example;
  const example =
    exampleRaw == null || !String(exampleRaw).trim() || String(exampleRaw).trim().toLowerCase() === "null"
      ? null
      : String(exampleRaw).trim();
  return {
    action: item.action?.trim() ?? "",
    why: item.why?.trim() ?? "",
    example,
  };
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
  const base = row.why?.trim() ? `${row.action} — ${row.why}` : row.action;
  if (!row.example?.trim()) return base;
  const ex = row.example.trim().replace(/^\(+|\)+$/g, "");
  return `${base} (e.g., ${ex})`;
}

export function formatPillarDontLine(item: PillarSynthesisDont | string): string {
  const row = normalizePillarDont(item);
  return row.why?.trim() ? `${row.behavior} — ${row.why}` : row.behavior;
}
