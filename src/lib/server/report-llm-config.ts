import { getAdminFirestore } from "@/lib/firebase/server";
import {
  DEFAULT_REPORT_LLM_PROVIDER,
  parseReportLlmProvider,
  type ReportLlmProvider,
} from "@/lib/recommendations/report-llm-types";
import type { AppSettingsDoc } from "@/types/models";

export function effectiveReportLlmProvider(settings: AppSettingsDoc | null | undefined): ReportLlmProvider {
  return parseReportLlmProvider(settings?.reportLlmProvider ?? DEFAULT_REPORT_LLM_PROVIDER);
}

export async function loadReportLlmProviderAdmin(): Promise<ReportLlmProvider> {
  const db = getAdminFirestore();
  if (!db) return DEFAULT_REPORT_LLM_PROVIDER;

  try {
    const snap = await db.doc("app_settings/global").get();
    const settings = snap.exists ? ((snap.data() ?? {}) as AppSettingsDoc) : {};
    return effectiveReportLlmProvider(settings);
  } catch {
    return DEFAULT_REPORT_LLM_PROVIDER;
  }
}
