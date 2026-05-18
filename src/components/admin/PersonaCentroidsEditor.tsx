"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PERSONA_ALPHA, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { PersonaCentroidTable, PersonaKey, TraitKey } from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS, TRAIT_LABELS } from "@/lib/scoring/persona-types";

type Props = {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

export function PersonaCentroidsEditor({ api, onMessage, onError }: Props) {
  const [centroids, setCentroids] = useState<PersonaCentroidTable | null>(null);
  const [alphaDraft, setAlphaDraft] = useState(String(DEFAULT_PERSONA_ALPHA));
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    onError(null);
    const [cRes, sRes] = await Promise.all([
      api("/api/admin/persona-centroids"),
      api("/api/admin/settings"),
    ]);
    const cJson = (await cRes.json()) as { centroids: PersonaCentroidTable };
    const sJson = (await sRes.json()) as { personaAlpha?: number };
    setCentroids(cJson.centroids);
    setAlphaDraft(String(sJson.personaAlpha ?? DEFAULT_PERSONA_ALPHA));
  }, [api, onError]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load persona config"));
  }, [load, onError]);

  const updateCell = (persona: PersonaKey, trait: TraitKey, raw: string) => {
    if (!centroids) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setCentroids({
      ...centroids,
      [persona]: { ...centroids[persona], [trait]: n },
    });
  };

  const saveCentroids = async () => {
    if (!centroids) return;
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/persona-centroids", {
        method: "PATCH",
        body: JSON.stringify({ centroids }),
      });
      onMessage("Persona centroids saved.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const resetCentroids = async () => {
    setBusy(true);
    onError(null);
    try {
      const res = await api("/api/admin/persona-centroids", { method: "PUT" });
      const j = (await res.json()) as { centroids: PersonaCentroidTable };
      setCentroids(j.centroids);
      onMessage("Centroids reset to product defaults.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const saveAlpha = async () => {
    const a = Number(alphaDraft);
    if (!Number.isFinite(a) || a <= 0 || a > 20) {
      onError("Alpha must be a number between 0 (exclusive) and 20.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({ personaAlpha: a }),
      });
      onMessage("Persona alpha saved.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!centroids) {
    return <p className="text-sm text-slate-500">Loading persona centroids…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Persona alpha (softmax temperature)</h2>
        <p className="mt-2 text-xs text-slate-600">
          Si = exp(alpha × −distance). Higher alpha sharpens matches toward the nearest centroid.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs font-semibold text-slate-700">
            Alpha
            <input
              type="number"
              min={0.01}
              max={20}
              step={0.1}
              value={alphaDraft}
              onChange={(e) => setAlphaDraft(e.target.value)}
              className="mt-1 w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveAlpha()}
            className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save alpha
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Persona centroid table</h2>
            <p className="mt-1 text-xs text-slate-600">
              Trait reference scores (1–7) per persona. Used for Euclidean distance matching.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveCentroids()}
              className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Save centroids
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void resetCentroids()}
              className="rounded-full border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50"
            >
              Reset to defaults
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Trait</th>
                {PERSONA_KEYS.map((p) => (
                  <th key={p} className="px-2 py-2 font-semibold text-slate-700">
                    {PERSONA_DISPLAY[p].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRAIT_KEYS.map((trait, idx) => (
                <tr key={trait} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-800">
                    {idx + 1}. {TRAIT_LABELS[trait]}
                  </td>
                  {PERSONA_KEYS.map((persona) => (
                    <td key={persona} className="px-2 py-1">
                      <input
                        type="number"
                        min={1}
                        max={7}
                        step={0.1}
                        value={centroids[persona][trait]}
                        onChange={(e) => updateCell(persona, trait, e.target.value)}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center font-mono"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
