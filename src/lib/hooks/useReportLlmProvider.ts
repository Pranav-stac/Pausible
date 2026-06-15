"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_REPORT_LLM_PROVIDER,
  parseReportLlmProvider,
  reportLlmModel,
  type ReportLlmProvider,
} from "@/lib/recommendations/report-llm-types";

export function useReportLlmProvider() {
  const [provider, setProvider] = useState<ReportLlmProvider>(DEFAULT_REPORT_LLM_PROVIDER);
  const [model, setModel] = useState(() => reportLlmModel(DEFAULT_REPORT_LLM_PROVIDER));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/config/report-llm", { cache: "no-store" });
        if (!res.ok) throw new Error("config fetch failed");
        const json = (await res.json()) as { provider?: unknown; model?: string };
        if (cancelled) return;
        const next = parseReportLlmProvider(json.provider);
        setProvider(next);
        setModel(typeof json.model === "string" && json.model.trim() ? json.model : reportLlmModel(next));
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { provider, model, ready };
}
