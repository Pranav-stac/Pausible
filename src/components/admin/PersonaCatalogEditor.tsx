"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersonaCatalogDoc, PersonaCatalogEntry } from "@/lib/admin/platform-config-types";
import type { PersonaKey } from "@/lib/scoring/persona-types";

type Props = {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

export function PersonaCatalogEditor({ api, onMessage, onError }: Props) {
  const [catalog, setCatalog] = useState<PersonaCatalogDoc | null>(null);
  const [keys, setKeys] = useState<PersonaKey[]>([]);
  const [active, setActive] = useState<PersonaKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    onError(null);
    const res = await api("/api/admin/persona-catalog");
    const j = (await res.json()) as { catalog: PersonaCatalogDoc; personaKeys: PersonaKey[] };
    setCatalog(j.catalog);
    setKeys(j.personaKeys);
    setActive((prev) => prev ?? j.personaKeys[0] ?? null);
  }, [api, onError]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load persona catalog"));
  }, [load, onError]);

  const patchEntry = (key: PersonaKey, patch: Partial<PersonaCatalogEntry>) => {
    if (!catalog) return;
    setCatalog({
      ...catalog,
      personas: { ...catalog.personas, [key]: { ...catalog.personas[key], ...patch } },
    });
  };

  const save = async () => {
    if (!catalog) return;
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/persona-catalog", { method: "PATCH", body: JSON.stringify(catalog) });
      onMessage("Persona catalog saved.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    onError(null);
    try {
      const res = await api("/api/admin/persona-catalog", { method: "PUT" });
      const j = (await res.json()) as { catalog: PersonaCatalogDoc };
      setCatalog(j.catalog);
      onMessage("Persona catalog reset to defaults.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (!catalog || !active) return <p className="text-sm text-slate-500">Loading persona catalog…</p>;
  const entry = catalog.personas[active];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Persona catalog</h2>
        <p className="mt-1 text-xs text-slate-600">
          Display names, archetypes, summaries, bullets, and spirit animals shown in results and share cards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                active === k ? "bg-sky-100 text-sky-950" : "bg-slate-100 text-slate-700"
              }`}
            >
              {catalog.personas[k]?.label ?? k}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{active.replace(/_/g, " ")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Label
            <input
              value={entry.label}
              onChange={(e) => patchEntry(active, { label: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Archetype
            <input
              value={entry.archetype}
              onChange={(e) => patchEntry(active, { archetype: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Animal name
            <input
              value={entry.animalName}
              onChange={(e) => patchEntry(active, { animalName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Emoji
            <input
              value={entry.emoji}
              onChange={(e) => patchEntry(active, { emoji: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
            Image path
            <input
              value={entry.imagePath}
              onChange={(e) => patchEntry(active, { imagePath: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-sm"
            />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
            Summary
            <textarea
              rows={3}
              value={entry.summary}
              onChange={(e) => patchEntry(active, { summary: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="sm:col-span-2 text-xs font-semibold text-slate-700">
            Bullets (one per line)
            <textarea
              rows={4}
              value={entry.bullets.join("\n")}
              onChange={(e) =>
                patchEntry(active, {
                  bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save catalog
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void reset()}
          className="rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
