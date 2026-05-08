"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ResultsStoryPosterChrome, type ResultsStoryPosterData } from "@/components/results/ResultsStoryPosterChrome";

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

async function rasterizePosterToBlob(base: ResultsStoryPosterData): Promise<Blob> {
  const { toBlob, toPng } = await import("html-to-image");

  const portrait = await embedPortraitForRaster(base.participantPhotoSrc);
  const poster: ResultsStoryPosterData = portrait === base.participantPhotoSrc ? base : { ...base, participantPhotoSrc: portrait };

  const host = document.createElement("div");
  host.setAttribute("data-pausible-story-export", "true");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `z-index:2147483646`,
    `width:${STORY_W}px`,
    `height:${STORY_H}px`,
    "pointer-events:none",
    "margin:0",
    "padding:0",
    "overflow:hidden",
    "opacity:1",
    "visibility:visible",
    "background:#050816",
    "caret-color:transparent",
  ].join(";");

  document.body.appendChild(host);

  const opts = {
    cacheBust: true,
    pixelRatio: 2,
    width: STORY_W,
    height: STORY_H,
    backgroundColor: "#050816",
    skipFonts: true,
  };

  let rootRet: ReturnType<typeof createRoot> | null = null;
  try {
    rootRet = createRoot(host);
    rootRet.render(<ResultsStoryPosterChrome {...poster} />);
    await new Promise<void>((resolve) =>
      queueMicrotask(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            queueMicrotask(() => resolve())),
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

  /** Omit title/text — some targets (e.g. Instagram) choke when combined with `files`. */
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

export function ResultsStoryPosterSection({
  poster,
  participant,
  filenameSlug,
  shareSnippetUrl,
}: {
  poster: ResultsStoryPosterData;
  participant?: ResultsStoryPosterParticipant | null;
  filenameSlug: string;
  /** Public share URL to include when opening WhatsApp (text fallback). */
  shareSnippetUrl?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoOverrideBlobUrl, setPhotoOverrideBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = photoOverrideBlobUrl;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [photoOverrideBlobUrl]);

  /** Revoke old blob URLs when replacing or clearing (strictMode double-mount skips leaking). */
  const replaceOverrideUrl = useCallback((next: string | null) => {
    setPhotoOverrideBlobUrl((prev) => {
      if (prev?.startsWith("blob:") && prev !== next) URL.revokeObjectURL(prev);
      return next;
    });
  }, []);

  const rawPortraitSrc = photoOverrideBlobUrl ?? participant?.googlePhotoUrl ?? poster.participantPhotoSrc ?? null;

  const mergedPoster = useMemo(
    (): ResultsStoryPosterData => ({
      ...poster,
      participantDisplayName: participant?.displayName ?? poster.participantDisplayName ?? null,
      participantPhotoSrc: rawPortraitSrc,
    }),
    [participant, poster, rawPortraitSrc],
  );

  const resetToGooglePortrait = useCallback(() => {
    replaceOverrideUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [replaceOverrideUrl]);

  const onPickPortrait = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f?.type.startsWith("image/")) return;
      if (f.size > 6 * 1024 * 1024) {
        window.alert("Please choose an image under 6MB.");
        return;
      }
      const url = URL.createObjectURL(f);
      replaceOverrideUrl(url);
    },
    [replaceOverrideUrl],
  );

  /** Preview: scale from native 540×960 with top-left origin so nothing drifts sideways. */
  const previewOuterW = 297;
  const previewScale = previewOuterW / STORY_W;
  const previewOuterH = Math.round(STORY_H * previewScale);

  const handleDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await rasterizePosterToBlob(mergedPoster);
      downloadBlob(blob, filenameSlug);
    } finally {
      setBusy(false);
    }
  }, [busy, mergedPoster, filenameSlug]);

  const handleSystemShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await rasterizePosterToBlob(mergedPoster);
      const ok = await shareImageFile(blob, filenameSlug).catch(() => false);
      if (!ok) {
        downloadBlob(blob, filenameSlug);
        window.alert(
          "Your browser can’t hand off the image automatically—PNG downloaded instead. Open the file from your downloads, tap Share (mobile), then pick Instagram or WhatsApp.",
        );
      }
    } finally {
      setBusy(false);
    }
  }, [busy, mergedPoster, filenameSlug]);

  const handleWhatsApp = useCallback(() => {
    openWhatsAppStatusHint(shareSnippetUrl);
  }, [shareSnippetUrl]);

  return (
    <div className="rounded-3xl border border-[#162042] bg-linear-to-br from-[#050816]/95 via-[#0a1530]/90 to-[#050816] p-7 shadow-[0_40px_100px_-40px_rgba(125,216,255,0.25)] ring-2 ring-[#234a7a]/55">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dd8ff]/90">Stories &amp; status</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Share your snapshot image</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/62">
            Includes your profile name &amp; photo on the Story card — photo defaults to Google, or pick a substitute for
            export only.&nbsp;
            <span className="text-white/72">Substitution lives in browser memory until you refresh; we don&apos;t store it.</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            disabled={busy}
            title="Opens the OS share sheet (mobile). Prefer Instagram Stories or WhatsApp."
            onClick={() => void handleSystemShare()}
            className="w-full rounded-2xl bg-white px-5 py-3 text-center text-sm font-bold text-[#061018] shadow-lg shadow-black/35 disabled:opacity-50 sm:min-w-[220px]"
          >
            {busy ? "Preparing…" : "Share image…"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownload()}
            className="w-full rounded-2xl border border-white/20 bg-black/35 px-5 py-3 text-center text-sm font-semibold text-white/95 shadow-inner shadow-black/30 disabled:opacity-50 sm:min-w-[220px]"
          >
            Download PNG (1080×1920)
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="w-full rounded-2xl border border-[#61aaff]/35 bg-black/25 px-5 py-3 text-center text-sm font-semibold text-[#c8efff] sm:min-w-[220px]"
          >
            WhatsApp (compose + tip)
          </button>
          <p className="hidden text-right text-[10px] leading-snug text-white/45 sm:block sm:max-w-[240px]">
            IG has no upload URL — use Share or Save, then Stories.
          </p>
        </div>
      </div>

      {participant?.displayName ? (
        <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-white/[0.1] bg-black/35 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/43">Shown on Story card</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{participant.displayName.trim()}</p>
            <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-white/52">
              {photoOverrideBlobUrl ? "Using your chosen image below — not saved anywhere." : "Portrait from Google; change stays in this browser only."}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-[#eaf8ff] hover:bg-white/15 disabled:opacity-50"
            >
              Pick image…
            </button>
            {photoOverrideBlobUrl ? (
              <button type="button" disabled={busy} onClick={resetToGooglePortrait} className="rounded-xl border border-[#61aaff]/35 bg-transparent px-3 py-2 text-xs font-semibold text-[#9fe8ff] hover:bg-black/35 disabled:opacity-50">
                Use Google photo
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => onPickPortrait(e)}
            />
          </div>
        </div>
      ) : null}

      <div className="relative mx-auto mt-10 flex justify-center pb-8 pt-6">
        <div className="pointer-events-none absolute inset-x-[6%] top-[18%] h-[52%] rounded-[40%] bg-[#7dd8ff]/10 blur-[56px]" />
        <div
          className="relative mx-auto overflow-hidden rounded-[1.85rem] shadow-[0_52px_80px_-48px_rgb(125,216,255,0.35)] ring-2 ring-[#274f8f]/95"
          style={{ width: previewOuterW, height: previewOuterH }}
        >
          <div style={{ width: STORY_W, height: STORY_H, transform: `scale(${previewScale})`, transformOrigin: "top left" }}>
            <ResultsStoryPosterChrome {...mergedPoster} />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-white/45">
        WhatsApp opens a chat composer with link + reminder to attach the PNG for Status — there is no public “status-only” upload API.
      </p>
    </div>
  );
}
