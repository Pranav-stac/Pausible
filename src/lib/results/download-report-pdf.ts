"use client";

const A4_W_MM = 210;
const A4_H_MM = 297;

/** ~150 DPI at report width — sharp enough for screen/print without bloating the file. */
const PDF_PIXEL_RATIO = 1.5;
const PDF_JPEG_QUALITY = 0.9;

/**
 * Renders each `[data-report-page]` block into a multi-page A4 PDF via html-to-image + jsPDF.
 * Uses JPEG (not PNG) so multi-page exports stay in the low-MB range instead of 50–100MB.
 */
export async function downloadReportAsPdf(root: HTMLElement, filename: string): Promise<void> {
  const pages = root.querySelectorAll<HTMLElement>("[data-report-page]");
  if (!pages.length) throw new Error("Report has no pages to export.");

  const { jsPDF } = await import("jspdf");
  const { toJpeg } = await import("html-to-image");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const dataUrl = await toJpeg(page, {
      pixelRatio: PDF_PIXEL_RATIO,
      quality: PDF_JPEG_QUALITY,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: page.offsetWidth,
      height: page.offsetHeight,
    });

    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, 0, A4_W_MM, A4_H_MM, undefined, "FAST");
  }

  const safe = filename.replace(/[^\w\-]+/g, "-").slice(0, 48) || "pausible-report";
  pdf.save(`${safe}.pdf`);
}
