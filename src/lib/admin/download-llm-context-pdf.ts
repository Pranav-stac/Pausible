"use client";

import type { AttemptLlmContextPackage } from "@/lib/recommendations/build-attempt-llm-context";
import { reportLlmProviderLabel } from "@/lib/recommendations/report-llm-types";

function outputSourceLabel(output: unknown): string {
  if (output == null) return "missing";
  const text = JSON.stringify(output);
  if (text.includes('"This fits your persona-specific patterns."')) return "deterministic fallback";
  if (text.includes('"_legacy":true') || text.includes('"_legacy": true')) return "legacy cached report";
  return "stored synthesis";
}

const MARGIN_MM = 14;
const LINE_HEIGHT_MM = 4.2;
const PAGE_H_MM = 297;
const PAGE_W_MM = 210;
const CONTENT_W_MM = PAGE_W_MM - MARGIN_MM * 2;

export async function downloadLlmContextAsPdf(pkg: AttemptLlmContextPackage, attemptId: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN_MM;

  const addPageIfNeeded = (neededMm: number) => {
    if (y + neededMm > PAGE_H_MM - MARGIN_MM) {
      pdf.addPage();
      y = MARGIN_MM;
    }
  };

  const writeWrapped = (text: string, fontSize = 8, style: "normal" | "bold" = "normal") => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, CONTENT_W_MM) as string[];
    for (const line of lines) {
      addPageIfNeeded(LINE_HEIGHT_MM);
      pdf.text(line, MARGIN_MM, y);
      y += LINE_HEIGHT_MM;
    }
  };

  const heading = (text: string) => {
    y += 2;
    addPageIfNeeded(LINE_HEIGHT_MM * 2);
    writeWrapped(text, 11, "bold");
    y += 1;
  };

  const block = (label: string, body: string) => {
    heading(label);
    writeWrapped(body, 8);
    y += 2;
  };

  heading(`LLM report context — ${attemptId}`);
  const cachedProvider = pkg.reportOutput.llmProvider;
  const cachedModel = pkg.reportOutput.tokenUsage?.model;
  const reportStatus = !pkg.reportOutput.available
    ? "No cached report on this attempt"
    : pkg.reportOutput.synthesized
      ? "LLM synthesis ran (see per-section output source below)"
      : "Deterministic fallback only (LLM did not complete)";

  writeWrapped(
    [
      `Current admin provider (prompt preview): ${reportLlmProviderLabel(pkg.provider)} · ${pkg.model}`,
      pkg.reportOutput.available
        ? `Cached report provider: ${reportLlmProviderLabel(cachedProvider ?? pkg.provider)}${cachedModel ? ` · ${cachedModel}` : ""}`
        : null,
      pkg.reportOutput.synthesizedAt
        ? `Cached at: ${new Date(pkg.reportOutput.synthesizedAt).toLocaleString()}`
        : null,
      `Report status: ${reportStatus}`,
      pkg.reportOutput.tokenUsage
        ? `Tokens: ${pkg.reportOutput.tokenUsage.totalTokens} (${pkg.reportOutput.tokenUsage.promptTokens} in · ${pkg.reportOutput.tokenUsage.completionTokens} out)`
        : null,
      pkg.reportOutput.synthesisError ? `Synthesis errors: ${pkg.reportOutput.synthesisError}` : null,
      `Fit tier: ${pkg.fitBlend.fitTier} · Blend ratio: ${
        Number.isFinite(pkg.fitBlend.blendRatio) ? pkg.fitBlend.blendRatio.toFixed(3) : "∞"
      } · Blend: ${pkg.fitBlend.blendStrength}`,
    ]
      .filter(Boolean)
      .join("\n"),
    9,
  );
  y += 2;

  block("Shared system prompt", pkg.systemPrompt);
  block("Shared synthesis context", JSON.stringify(pkg.sharedContext, null, 2));

  for (const section of pkg.sections) {
    const status = section.skipped ? "Skipped" : "Active";
    heading(`Slide ${section.slide} · ${section.label} (${status})`);
    if (section.skipped && section.skipReason) {
      writeWrapped(`Skip reason: ${section.skipReason}`, 8);
      y += 1;
    }
    block("Structured input data", JSON.stringify(section.inputData, null, 2));
    block("Expected JSON output", JSON.stringify(section.outputSchema, null, 2));
    block(
      `Actual LLM output (${outputSourceLabel(section.output)})`,
      section.output != null ? JSON.stringify(section.output, null, 2) : "(no stored output)",
    );
    block("User prompt sent to LLM", section.userPrompt || "(empty)");
    y += 3;
  }

  const safe = `llm-context-${attemptId}`.replace(/[^\w\-]+/g, "-").slice(0, 64) || "llm-context";
  pdf.save(`${safe}.pdf`);
}
