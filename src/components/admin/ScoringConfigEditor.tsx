"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoringConfigDoc } from "@/lib/admin/platform-config-types";

type Props = {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

function OceanTagsPanel({ api, onMessage, onError }: Props) {
  const [jsonDraft, setJsonDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api("/api/admin/ocean-tags");
    const j = (await res.json()) as { config: unknown };
    setJsonDraft(JSON.stringify(j.config, null, 2));
  }, [api]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load OCEAN tags"));
  }, [load, onError]);

  const seed = async () => {
    setBusy(true);
    try {
      await api("/api/admin/ocean-tags", { method: "PUT" });
      await load();
      onMessage("OCEAN tag bands seeded from repo.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    onError(null);
    try {
      const parsed = JSON.parse(jsonDraft) as unknown;
      await api("/api/admin/ocean-tags", { method: "PATCH", body: JSON.stringify(parsed) });
      onMessage("OCEAN tag bands saved.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed — check JSON");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <textarea
        rows={12}
        value={jsonDraft}
        onChange={(e) => setJsonDraft(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
        spellCheck={false}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void seed()}
          className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 disabled:opacity-50"
        >
          Seed from repo
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 disabled:opacity-50"
        >
          Save tag bands
        </button>
      </div>
    </div>
  );
}

export function ScoringConfigEditor({ api, onMessage, onError }: Props) {
  const [config, setConfig] = useState<ScoringConfigDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    onError(null);
    const res = await api("/api/admin/scoring-config");
    const j = (await res.json()) as { config: ScoringConfigDoc };
    setConfig(j.config);
  }, [api, onError]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load scoring config"));
  }, [load, onError]);

  const save = async () => {
    if (!config) return;
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/scoring-config", { method: "PATCH", body: JSON.stringify(config) });
      onMessage("Scoring formulas saved.");
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
      const res = await api("/api/admin/scoring-config", { method: "PUT" });
      const j = (await res.json()) as { config: ScoringConfigDoc };
      setConfig(j.config);
      onMessage("Scoring formulas reset to defaults.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (!config) return <p className="text-sm text-slate-500">Loading scoring config…</p>;

  const num = (v: number, on: (n: number) => void) => (
    <input
      type="number"
      step="0.1"
      value={v}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) on(n);
      }}
      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
    />
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Scoring & formulas</h2>
        <p className="mt-1 text-xs text-slate-600">
          Fit tiers, blend bands, Likert scale, and trait deviation threshold used at submit time and in reports.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-semibold text-slate-700">
            Likert min
            {num(config.likertMin, (n) => setConfig({ ...config, likertMin: n }))}
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Likert max
            {num(config.likertMax, (n) => setConfig({ ...config, likertMax: n }))}
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Trait deviation threshold
            {num(config.traitDeviationThreshold, (n) => setConfig({ ...config, traitDeviationThreshold: n }))}
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fit tier bands (min score)</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["classic", "core", "adaptive", "emerging"] as const).map((tier) => (
            <label key={tier} className="text-xs font-semibold capitalize text-slate-700">
              {tier}
              {num(config.fitTierBands[tier], (n) =>
                setConfig({ ...config, fitTierBands: { ...config.fitTierBands, [tier]: n } }),
              )}
            </label>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Must be descending: classic &gt; core &gt; adaptive &gt; emerging.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blend ratio bands</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Pure (ratio &gt;)
            {num(config.blendRatioBands.pure, (n) =>
              setConfig({ ...config, blendRatioBands: { ...config.blendRatioBands, pure: n } }),
            )}
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Tendencies (ratio ≥)
            {num(config.blendRatioBands.tendencies, (n) =>
              setConfig({ ...config, blendRatioBands: { ...config.blendRatioBands, tendencies: n } }),
            )}
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Below tendencies threshold = strong secondary influence.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">OCEAN analytics tag bands</h3>
        <p className="mt-2 text-xs text-slate-600">
          Trait and facet score bands that produce analytics tags (e.g. openness_high). Stored in Firestore; seed from repo
          JSON to start.
        </p>
        <OceanTagsPanel api={api} onMessage={onMessage} onError={onError} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save formulas
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
