"use client";

import { useCallback, useRef, useState } from "react";
import { ResultsStoryPosterChrome, type ResultsStoryPosterData } from "@/components/results/ResultsStoryPosterChrome";

async function pngFromPosterNode(node: HTMLElement, filenameBase: string) {
  const { toPng } = await import("html-to-image");
  const url = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#050816",
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase.replace(/[^\w\-]+/g, "-").slice(0, 44)}-pausible-story.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Preview scaled; hidden twin used for rasterization at native 540×960. */
export function ResultsStoryPosterSection({ poster, filenameSlug }: { poster: ResultsStoryPosterData; filenameSlug: string }) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = useCallback(async () => {
    const node = captureRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      await pngFromPosterNode(node, filenameSlug);
    } finally {
      setBusy(false);
    }
  }, [busy, filenameSlug]);

  return (
    <>
      <div className="rounded-3xl border border-[#162042] bg-linear-to-br from-[#050816]/95 via-[#0a1530]/90 to-[#050816] p-7 shadow-[0_40px_100px_-40px_rgba(125,216,255,0.25)] ring-2 ring-[#234a7a]/55">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dd8ff]/90">Stories &amp; reels</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Share your snapshot as an image</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/62">
              9:16 card in the homepage hero palette — luminous meters, trend line, hashtags. Save PNG and upload to&nbsp;Instagram Stories.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="shrink-0 rounded-2xl bg-linear-to-r from-[#61aaff] to-[#7dd8ff] px-5 py-3 text-sm font-bold text-[#061018] shadow-lg shadow-black/35 disabled:opacity-50"
          >
            {busy ? "Rendering…" : "Download PNG (1080×1920)"}
          </button>
        </div>

        <div className="relative mx-auto mt-12 flex justify-center pb-6 pt-16">
          <div className="pointer-events-none absolute inset-x-[8%] top-1/4 h-[50%] rounded-[40%] bg-[#7dd8ff]/12 blur-[60px]" />
          <div
            className="relative overflow-hidden rounded-[1.85rem] shadow-[0_52px_80px_-48px_rgb(125,216,255,0.35)] ring-2 ring-[#274f8f]/95"
            style={{ width: 297, height: 528 }}
          >
            <div className="flex origin-top justify-center bg-[#050816]" style={{ transform: "scale(0.55)", transformOrigin: "top center", width: 540 }}>
              <ResultsStoryPosterChrome {...poster} />
            </div>
          </div>
        </div>
      </div>

      <div ref={captureRef} className="fixed left-[-12000px] top-0 -z-[3] opacity-100" aria-hidden>
        <ResultsStoryPosterChrome {...poster} />
      </div>
    </>
  );
}
