"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";

type Props = {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onMessage: (msg: string | null) => void;
  onError: (err: string | null) => void;
};

function RecordFields({
  title,
  record,
  onChange,
}: {
  title: string;
  record: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-4 space-y-3">
        {Object.entries(record).map(([key, value]) => (
          <label key={key} className="block text-xs font-semibold text-slate-700">
            {key}
            <input
              value={value}
              onChange={(e) => onChange({ ...record, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function ReportTemplatesEditor({ api, onMessage, onError }: Props) {
  const [templates, setTemplates] = useState<ReportTemplatesDoc | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    onError(null);
    const res = await api("/api/admin/report-templates");
    const j = (await res.json()) as { templates: ReportTemplatesDoc };
    setTemplates(j.templates);
  }, [api, onError]);

  useEffect(() => {
    void load().catch((e) => onError(e instanceof Error ? e.message : "Failed to load report templates"));
  }, [load, onError]);

  const save = async () => {
    if (!templates) return;
    setBusy(true);
    onError(null);
    try {
      await api("/api/admin/report-templates", { method: "PATCH", body: JSON.stringify(templates) });
      onMessage("Report templates saved.");
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
      const res = await api("/api/admin/report-templates", { method: "PUT" });
      const j = (await res.json()) as { templates: ReportTemplatesDoc };
      setTemplates(j.templates);
      onMessage("Report templates reset to defaults.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  if (!templates) return <p className="text-sm text-slate-500">Loading report templates…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Report templates</h2>
        <p className="mt-1 text-xs text-slate-600">
          Slide section labels, Gemini tone guidance, blend rules, and wellness pillar names used in the full report.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-700">
          Report version label
          <input
            value={templates.reportVersionLabel}
            onChange={(e) => setTemplates({ ...templates, reportVersionLabel: e.target.value })}
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <RecordFields
        title="Slide labels"
        record={templates.slideLabels}
        onChange={(slideLabels) => setTemplates({ ...templates, slideLabels })}
      />
      <RecordFields
        title="Gemini fit-tier tone"
        record={templates.geminiFitTierTone}
        onChange={(geminiFitTierTone) => setTemplates({ ...templates, geminiFitTierTone })}
      />
      <RecordFields
        title="Gemini blend rules"
        record={templates.geminiBlendRules}
        onChange={(geminiBlendRules) => setTemplates({ ...templates, geminiBlendRules })}
      />
      <RecordFields
        title="Wellness pillar labels"
        record={templates.pillarLabels}
        onChange={(pillarLabels) => setTemplates({ ...templates, pillarLabels })}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save templates
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
