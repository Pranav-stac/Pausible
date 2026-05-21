"use client";

const A4_W_MM = 210;
const A4_H_MM = 297;

/**
 * Renders each `[data-report-page]` block into a multi-page A4 PDF via html-to-image + jsPDF.
 */
export async function downloadReportAsPdf(root: HTMLElement, filename: string): Promise<void> {
  const pages = root.querySelectorAll<HTMLElement>("[data-report-page]");
  if (!pages.length) throw new Error("Report has no pages to export.");

  const { jsPDF } = await import("jspdf");
  const { toPng } = await import("html-to-image");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const dataUrl = await toPng(page, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: page.offsetWidth,
      height: page.offsetHeight,
    });

    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, 0, A4_W_MM, A4_H_MM);
  }

  const safe = filename.replace(/[^\w\-]+/g, "-").slice(0, 48) || "pausible-report";
  pdf.save(`${safe}.pdf`);
}
