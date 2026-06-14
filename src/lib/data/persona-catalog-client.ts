import type { PersonaCatalogDoc } from "@/lib/admin/platform-config-types";
import { buildDefaultPersonaCatalog } from "@/lib/admin/platform-config-defaults";
import type { PersonaKey } from "@/lib/scoring/persona-types";

let cache: { personas: PersonaCatalogDoc["personas"]; at: number } | null = null;
const TTL_MS = 60_000;

export async function fetchPersonaCatalogClient(): Promise<PersonaCatalogDoc["personas"]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.personas;
  try {
    const res = await fetch("/api/config/persona-catalog", { cache: "no-store" });
    if (!res.ok) throw new Error("catalog fetch failed");
    const j = (await res.json()) as PersonaCatalogDoc;
    cache = { personas: j.personas, at: Date.now() };
    return j.personas;
  } catch {
    return buildDefaultPersonaCatalog().personas;
  }
}

export function getCachedPersonaCatalog(): PersonaCatalogDoc["personas"] | null {
  return cache?.personas ?? null;
}

export function personaCatalogEntry(key?: string | null) {
  if (!key) return null;
  const cat = getCachedPersonaCatalog();
  return cat?.[key as PersonaKey] ?? null;
}
