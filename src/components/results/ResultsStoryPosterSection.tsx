"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  ResultsStoryPosterChrome,
  type ResultsStoryPosterData,
  type StoryPosterTheme,
} from "@/components/results/ResultsStoryPosterChrome";

const STORY_W = 540;
const STORY_H = 960;

export type ResultsStoryPosterParticipant = {
  displayName: string;
  googlePhotoUrl: string | null;
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("read"));
    fr.readAsDataURL(blob);
  });
}

async function embedPortraitForRaster(raw?: string | null): Promise<string | undefined> {
  if (!raw?.trim()) return undefined;
  const u = raw.trim();
  if (u.startsWith("data:") || u.startsWith("blob:")) return u;
  if (!/^https?:\/\//i.test(u)) return u;
  try {
    const res = await fetch(u, { mode: "cors" });
    if (!res.ok) return u;
    return await blobToDataUrl(await res.blob());
  } catch {
    return u;
  }
}

async function rasterizePosterToBlob(base: ResultsStoryPosterData, exportTheme: StoryPosterTheme): Promise<Blob> {
  const { toBlob, toPng } = await import("html-to-image");

  const portrait = await embedPortraitForRaster(base.participantPhotoSrc);
  const poster: ResultsStoryPosterData = portrait === base.participantPhotoSrc ? base : { ...base, participantPhotoSrc: portrait };

  const host = document.createElement("div");
  host.setAttribute("data-pausible-story-export", "true");
  const bg = exportTheme === "light" ? "#fafbfc" : "#050816";
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "z-index:2147483646",
    `width:${STORY_W}px`,
    `height:${STORY_H}px`,
    "pointer-events:none",
    "margin:0",
    "padding:0",
    "overflow:hidden",
    "opacity:1",
    "visibility:visible",
    `background:${bg}`,
    "caret-color:transparent",
  ].join(";");

  document.body.appendChild(host);

  const opts = {
    cacheBust: true,
    pixelRatio: 2,
    width: STORY_W,
    height: STORY_H,
    backgroundColor: bg,
    skipFonts: true,
  };

  let rootRet: ReturnType<typeof createRoot> | null = null;
  try {
    rootRet = createRoot(host);
    rootRet.render(<ResultsStoryPosterChrome {...poster} theme={exportTheme} />);
    await new Promise<void>((resolve) =>
      queueMicrotask(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => queueMicrotask(() => resolve())),
        ),
      ),
    );

    const inner = host.firstElementChild as HTMLElement | null;
    if (!inner) throw new Error("Poster did not mount");

    let blob = await toBlob(inner, opts);
    if (!blob || blob.size < 900) {
      const dataUrl = await toPng(inner, opts);
      const fetched = await fetch(dataUrl);
      blob = await fetched.blob();
    }
    if (!blob.size) throw new Error("Empty raster");
    return blob;
  } finally {
    rootRet?.unmount();
    host.remove();
  }
}

function downloadBlob(blob: Blob, basename: string) {
  const name = `${basename.replace(/[^\w\-]+/g, "-").slice(0, 44)}-pausible-story.png`;
  const u = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(u);
  }
}

async function shareImageFile(blob: Blob, basename: string): Promise<boolean> {
  const name = `${basename.replace(/[^\w\-]+/g, "-").slice(0, 44)}-pausible-story.png`;
  const file = new File([blob], name, {
    type: blob.type.startsWith("image/") ? blob.type : "image/png",
    lastModified: Date.now(),
  });

  const data: ShareData = { files: [file] };
  if (!navigator.share) return false;
  if (!navigator.canShare?.(data)) return false;

  await navigator.share(data);
  return true;
}

function openWhatsAppStatusHint(extraUrl?: string | null) {
  const link = typeof extraUrl === "string" && extraUrl.trim() ? extraUrl.trim() : "";
  const body = link
    ? `My Pausible spotlight — tap to view.\n${link}\n\nTip: Save the Story PNG above, then post it to WhatsApp Status from your gallery.`
    : "My behavioral snapshot — from Pausible. Save your Story PNG, then post it on WhatsApp Status from your gallery.";
  window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
}

function PortraitPreview({
  displayName,
  photoSrc,
}: {
  displayName: string;
  photoSrc: string | null;
}) {
  const initials = displayName
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "?";

  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-full bg-linear-to-br from-sky-400 via-indigo-400 to-violet-400 opacity-80 blur-sm" aria-hidden />
      <div className="relative size-20 overflow-hidden rounded-full ring-4 ring-white shadow-lg sm:size-24">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid h-full w-full place-items-center bg-linear-to-br from-sky-100 to-indigo-100 text-2xl font-black text-indigo-900">
            {initials}
          </div>
        )}
      </div>
      <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
        On card
      </span>
    </div>
  );
}

export function ResultsStoryPosterSection({
  poster,
  participant,
  filenameSlug,
  shareSnippetUrl,
  variant = "light",
}: {
  poster: ResultsStoryPosterData;
  participant?: ResultsStoryPosterParticipant | null;
  filenameSlug: string;
  shareSnippetUrl?: string | null;
  variant?: "light" | "dark";
}) {
  const exportTheme: StoryPosterTheme = variant === "light" ? "light" : "dark";
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoOverrideBlobUrl, setPhotoOverrideBlobUrl] = useState<string | null>(null);

  const replaceOverrideUrl = useCallback((next: string | null) => {
    setPhotoOverrideBlobUrl((prev) => {
      if (prev?.startsWith("blob:") && prev !== next) URL.revokeObjectURL(prev);
      return next;
    });
  }, []);

  const rawPortraitSrc = photoOverrideBlobUrl ?? participant?.googlePhotoUrl ?? poster.participantPhotoSrc ?? null;
  const displayName = participant?.displayName?.trim() ?? poster.participantDisplayName?.trim() ?? "";

  const mergedPoster = useMemo(
    (): ResultsStoryPosterData => ({
      ...poster,
      participantDisplayName: displayName || null,
      participantPhotoSrc: rawPortraitSrc,
    }),
    [displayName, poster, rawPortraitSrc],
  );

  const resetToGooglePortrait = useCallback(() => {
    replaceOverrideUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [replaceOverrideUrl]);

  const onPickPortrait = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f?.type.startsWith("image/")) return;
      if (f.size > 6 * 1024 * 1024) {
        window.alert("Please choose an image under 6MB.");
        return;
      }
      replaceOverrideUrl(URL.createObjectURL(f));
    },
    [replaceOverrideUrl],
  );

  const previewOuterW = 280;
  const previewScale = previewOuterW / STORY_W;
  const previewOuterH = Math.round(STORY_H * previewScale);

  const rasterize = useCallback(async () => rasterizePosterToBlob(mergedPoster, exportTheme), [mergedPoster, exportTheme]);

  const handleDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      downloadBlob(await rasterize(), filenameSlug);
    } finally {
      setBusy(false);
    }
  }, [busy, rasterize, filenameSlug]);

  const handleSystemShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await rasterize();
      const ok = await shareImageFile(blob, filenameSlug).catch(() => false);
      if (!ok) {
        downloadBlob(blob, filenameSlug);
        window.alert(
          "Your browser can't share the image directly — PNG downloaded instead. Open it from downloads, then share to Stories or WhatsApp.",
        );
      }
    } finally {
      setBusy(false);
    }
  }, [busy, rasterize, filenameSlug]);

  return (
    <section className="results-bento-in scheme-light overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.15)]">
      {/* Header */}
      <div className="border-b border-slate-100 bg-linear-to-r from-sky-50/80 via-white to-violet-50/50 px-4 py-5 sm:px-7 sm:py-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-700">Stories &amp; status</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Share your wellness snapshot</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Visual card with your persona, fit score, and trait footprint — export as 1080×1920 for Stories or WhatsApp Status.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_auto]">
        {/* Left: profile + actions bento */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:gap-5 sm:p-6 lg:border-b-0 lg:border-r">
          {/* Profile bento */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">On your story card</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              {displayName ? (
                <PortraitPreview displayName={displayName} photoSrc={rawPortraitSrc} />
              ) : (
                <div className="size-20 rounded-full bg-slate-200 sm:size-24" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight text-slate-950 sm:text-xl">{displayName || "Guest"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Position: top identity block · left portrait · right name
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {photoOverrideBlobUrl
                    ? "Using your picked image (browser only, not saved)."
                    : "Portrait from Google — swap anytime below."}
                </p>
              </div>
            </div>

            {participant?.displayName ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-11 flex-1 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-[0.98] sm:flex-none"
                >
                  Pick photo
                </button>
                {photoOverrideBlobUrl ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetToGooglePortrait}
                    className="min-h-11 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-xs font-bold text-sky-800"
                  >
                    Use Google
                  </button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={onPickPortrait}
                />
              </div>
            ) : null}
          </div>

          {/* Layout legend */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: "Photo", v: "Top-left ring" },
              { k: "Name", v: "Beside portrait" },
              { k: "Persona", v: "Center headline" },
              { k: "Traits", v: "Bottom meters" },
            ].map((item) => (
              <div key={item.k} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.k}</p>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-700">{item.v}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSystemShare()}
              className="min-h-12 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50 active:scale-[0.98]"
            >
              {busy ? "Preparing…" : "Share image"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDownload()}
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm disabled:opacity-50"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => openWhatsAppStatusHint(shareSnippetUrl)}
              className="min-h-12 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-900"
            >
              WhatsApp tip
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Instagram has no direct upload URL — use Share or Save, then add from your gallery. WhatsApp opens a compose
            helper with your link.
          </p>
        </div>

        {/* Right: phone preview */}
        <div className="flex flex-col items-center bg-linear-to-b from-slate-50/80 to-white px-4 py-8 sm:px-8 lg:min-w-[320px]">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Live preview</p>

          {/* Phone frame */}
          <div className="relative rounded-[2.5rem] bg-slate-900 p-2.5 shadow-[0_32px_64px_-24px_rgba(15,23,42,0.45)] ring-1 ring-slate-800">
            <div className="absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-slate-800" aria-hidden />
            <div
              className="relative overflow-hidden rounded-[2rem] bg-white ring-1 ring-slate-700/50"
              style={{ width: previewOuterW + 4, height: previewOuterH + 4 }}
            >
              <div
                style={{
                  width: STORY_W,
                  height: STORY_H,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <ResultsStoryPosterChrome {...mergedPoster} theme={exportTheme} />
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-medium text-slate-500">540 × 960 · exports at 2× (1080×1920)</p>
        </div>
      </div>
    </section>
  );
}
