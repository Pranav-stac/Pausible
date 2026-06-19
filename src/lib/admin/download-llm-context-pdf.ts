"use client";

import type { AttemptLlmContextPackage } from "@/lib/recommendations/build-attempt-llm-context";
import { reportLlmProviderLabel } from "@/lib/recommendations/report-llm-types";

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
  writeWrapped(
    [
      `Provider: ${reportLlmProviderLabel(pkg.provider)}`,
      `Model: ${pkg.model}`,
      `Fit tier: ${pkg.fitBlend.fitTier} · Blend: ${pkg.fitBlend.blendStrength}`,
    ].join("\n"),
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
      "Actual LLM output",
      section.output != null ? JSON.stringify(section.output, null, 2) : "(no stored output)",
    );
    block("User prompt sent to LLM", section.userPrompt || "(empty)");
    y += 3;
  }

  const safe = `llm-context-${attemptId}`.replace(/[^\w\-]+/g, "-").slice(0, 64) || "llm-context";
  pdf.save(`${safe}.pdf`);
}
