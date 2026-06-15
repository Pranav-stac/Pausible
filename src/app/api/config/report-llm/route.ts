import { NextResponse } from "next/server";
import { reportLlmModel } from "@/lib/recommendations/report-llm-types";
import { loadReportLlmProviderAdmin } from "@/lib/server/report-llm-config";

export const runtime = "nodejs";

/** Public read of which LLM generates wellness reports (no secrets). */
export async function GET() {
  const provider = await loadReportLlmProviderAdmin();
  return NextResponse.json({
    provider,
    model: reportLlmModel(provider),
  });
}
