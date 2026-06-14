"use client";

import { useCallback, useEffect, useState } from "react";
import type { RecommendationConfig } from "@/lib/recommendations/firestore-config-types";

type Section = "recommendations" | "tagMappingRules" | "wellnessFields" | "derivedExclusionRules" | "healthExclusionByAnswer";

const SECTIONS: { id: Section; label: string; hint: string }[] = [
  { id: "recommendations", label: "Master recommendations", hint: "PI series rows with tags, pillars, and copy." },
  { id: "tagMappingRules", label: "Tag mapping rules", hint: "Wellness answers → OCEAN / persona tags." },
  { id: "wellnessFields", label: "Wellness fields", hint: "Questionnaire field metadata for tag derivation." },
  { id: "derivedExclusionRules", label: "Derived exclusions", hint: "Rules that drop recommendations by tag combos." },
  { id: "healthExclusionByAnswer", label: "Health exclusions", hint: "Per-answer health gate exclusions." },
];

type Props = {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

export function RecommendationsConfigEditor({ api, onMessage, onError }: Props) {
  const [config, setConfig] = useState<RecommendationConfig | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [section, setSection] = useState<Section>("recommendations");
  const [jsonDraft, setJsonDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    onError(null);
    const res = await api("/api/admin/recommendations/config");
    const j = (await res.json()) as { config: RecommendationConfig; seeded: boolean };
    setConfig(j.config);
    setSeeded(j.seeded);
  }, [api, onError]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load recommendations"));
  }, [load, onError]);

  useEffect(() => {
    if (config) setJsonDraft(JSON.stringify(config[section], null, 2));
  }, [section, config]);

  const applyDraft = () => {
    if (!config) return;
    try {
      const parsed = JSON.parse(jsonDraft) as RecommendationConfig[Section];
      setConfig({ ...config, [section]: parsed });
      onError(null);
    } catch {
      onError("Invalid JSON in editor — fix syntax before saving.");
    }
  };

  const save = async () => {
    if (!config) return;
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/recommendations/config", { method: "PATCH", body: JSON.stringify(config) });
      onMessage("Recommendations config saved.");
      setSeeded(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    setBusy(true);
    onError(null);
    try {
      const res = await api("/api/admin/recommendations/config", { method: "PUT" });
      await res.json();
      await load();
      onMessage("Recommendations seeded from repo defaults.");
      setSeeded(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setBusy(false);
    }
  };

  if (!config) return <p className="text-sm text-slate-500">Loading recommendations config…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Recommendations engine</h2>
            <p className="mt-1 text-xs text-slate-600">
              Master PI rows, tag rules, wellness mappings, and exclusion logic — stored in Firestore.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Status: {seeded ? "configured" : "not seeded"} · {config.recommendations.length} recommendations ·{" "}
              {config.tagMappingRules.length} tag rules
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void seed()}
            className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-950 disabled:opacity-50"
          >
            Seed from repo
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                section === s.id ? "bg-sky-100 text-sky-950" : "bg-slate-100 text-slate-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{SECTIONS.find((s) => s.id === section)?.hint}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <textarea
          rows={22}
          value={jsonDraft}
          onChange={(e) => setJsonDraft(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed"
          spellCheck={false}
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={applyDraft}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800"
          >
            Apply JSON to draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Save to Firestore
          </button>
        </div>
      </div>
    </div>
  );
}
