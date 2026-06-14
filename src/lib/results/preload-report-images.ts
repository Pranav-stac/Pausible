import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { personaAnimal } from "@/lib/results/persona-display";

export function collectReportImageUrls(model: ResultsReportModel): string[] {
  const urls = new Set<string>();
  if (model.animalImagePath) urls.add(model.animalImagePath);
  if (model.secondaryKey) {
    const path = personaAnimal(model.secondaryKey)?.imagePath;
    if (path) urls.add(path);
  }
  return [...urls];
}

function preloadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Best-effort preload; resolves after all images load or timeout. */
export async function preloadReportImages(urls: string[], timeoutMs = 8000): Promise<void> {
  if (!urls.length || typeof window === "undefined") return;

  await Promise.race([
    Promise.all(urls.map(preloadOne)),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}
