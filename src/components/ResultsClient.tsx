"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavAuthActions } from "@/components/NavAuthActions";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { fetchAttempt, listMyAttempts } from "@/lib/data/attempt-service";
import { fetchAssessment } from "@/lib/data/assessment-service";
import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { getArchetypeCopy } from "@/lib/results/archetype";
import { dimensionRowsForAttempt } from "@/lib/results/dimension-rows";
import { ResultsStoryPosterSection } from "@/components/results/ResultsStoryPosterSection";

function ResultsTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/85 bg-white/95 backdrop-blur-sm scheme-light">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2 px-3 py-2.5 sm:justify-between sm:px-4 sm:py-3">
        <Link
          href="/"
          className="mr-auto shrink-0 rounded-lg text-sm font-semibold text-slate-900 outline-offset-4 hover:text-slate-700 sm:mr-0"
        >
          Home
        </Link>
        {isFirebaseConfigured() ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NavAuthActions />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ResultsClient() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const { effectiveUid, ready, linkGoogle, signInWithGoogle, user } = useFirebaseAuth();
  const hasGoogleIdentity = Boolean(user && !user.isAnonymous && user.email);
  const mustUseGoogle = isFirebaseConfigured();

  const [attempt, setAttempt] = useState<SerializedAttempt | null>(null);
  const [assessment, setAssessment] = useState<AssessmentDefinition | null>(null);
  const [history, setHistory] = useState<SerializedAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!ready || !attemptId || !effectiveUid) return;
    if (mustUseGoogle && !hasGoogleIdentity) return;

    let cancelled = false;

    (async () => {
      setFetching(true);
      setError(null);
      setAttempt(null);
      setAssessment(null);
      setHistory([]);

      const row = await fetchAttempt(attemptId);
      if (cancelled) return;

      if (!row || row.uid !== effectiveUid) {
        setError("Not found");
        setFetching(false);
        return;
      }
      setAttempt(row);

      try {
        const asm = await fetchAssessment(row.assessmentId);
        if (cancelled) return;
        if (!asm) {
          setError(
            `Assessment "${row.assessmentId}" was not found in Firestore or is inactive. Sync it from Admin (e.g. “Sync default from question.json”).`,
          );
          setFetching(false);
          return;
        }
        setAssessment(asm);
        const all = await listMyAttempts(effectiveUid);
        if (cancelled) return;
        setHistory(all);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load assessment from Firestore");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, effectiveUid, hasGoogleIdentity, mustUseGoogle, ready]);

  const arch = useMemo(
    () => (assessment && attempt?.scores ? getArchetypeCopy(assessment, attempt.scores.archetypeKey) : null),
    [assessment, attempt],
  );

  const dimensionRows = useMemo(
    () => (assessment && attempt ? dimensionRowsForAttempt(assessment, attempt) : []),
    [assessment, attempt],
  );

  const posterHostSlug = useMemo(() => {
    const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//i, "").split("/")[0];
    return raw || "pausible.com";
  }, []);

  function archetypeHashtagSlug(label?: string | null) {
    if (!label?.trim()) return "ProfileGlow";
    const fused = label
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .slice(0, 22);
    return fused || "ProfileGlow";
  }

  const storyPoster = useMemo(() => {
    const sum = arch?.summary?.trim() ?? "";
    const line = sum.length > 160 ? `${sum.slice(0, 157)}…` : sum || "Fitness behavioral spotlight — dimensional mix from your latest assessment.";
    return {
      archetypeLabel: arch?.label ?? "Your profile",
      line,
      dimensions: dimensionRows.slice(0, 6).map((d) => ({ label: d.label, pct: d.pct })),
      hashtags: ["Pausible", `Paus${archetypeHashtagSlug(arch?.label)}`, "FitnessMind"],
      siteSlug: `${posterHostSlug} · spotlight`,
    };
  }, [arch, dimensionRows, posterHostSlug]);
  const shareUrl = useMemo(() => {
    if (!attempt?.shareToken || !attempt.isLatestShareEligible || attempt.paymentStatus !== "paid") return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/share/${attempt.shareToken}`;
  }, [attempt]);

  const copyShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <div className="p-10 text-center text-sm text-slate-600">Loading results…</div>
      </div>
    );
  }

  if (mustUseGoogle && !hasGoogleIdentity) {
    if (!user) {
      return (
        <div className="min-h-screen bg-white scheme-light text-slate-900">
          <ResultsTopBar />
          <div className="p-10 text-center text-sm text-slate-600">Preparing your session…</div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="mx-auto max-w-lg px-4 py-12 text-center sm:py-16">
          <h1 className="text-lg font-semibold text-slate-900">Sign in to view results</h1>
          {user.isAnonymous ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Link Google from this browser to keep your current attempt tied to one account.&nbsp;
                <span className="font-semibold text-slate-700">Do not tap “Sign in” in another tab</span>—that replaces
                the guest session and this link won&apos;t resolve until you link here.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => void linkGoogle()}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
                >
                  Link Google
                </button>
                <Link href="/" className="text-sm font-semibold text-sky-700 hover:text-indigo-800">
                  ← Home
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Your Google identity is needed to load paid results from Firebase for this deployment.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
                >
                  Sign in with Google
                </button>
                <Link href="/" className="text-sm font-semibold text-sky-700 hover:text-indigo-800">
                  ← Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!effectiveUid) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="p-10 text-center text-sm text-slate-600">Connecting your profile…</div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="p-10 text-center text-sm text-slate-600">Loading results…</div>
      </div>
    );
  }

  if (error || !attempt || !assessment) {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-16">
          <p className="text-sm leading-relaxed text-slate-600">{error ?? "Something went wrong."}</p>
          {error === "Not found" && isFirebaseConfigured() ? (
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-slate-500">
              Tip: if you started as a guest, use <strong className="text-slate-700">Link Google</strong> in the top bar
              on this page so your attempt stays on the same profile.
            </p>
          ) : null}
          <Link
            href="/assessment/default"
            className="mt-8 inline-block text-sm font-semibold text-sky-700 underline decoration-sky-300 underline-offset-[3px] hover:text-indigo-800"
          >
            Start assessment
          </Link>
        </div>
      </div>
    );
  }

  if (attempt.paymentStatus !== "paid") {
    return (
      <div className="min-h-screen bg-white scheme-light text-slate-900">
        <ResultsTopBar />
        <div className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-xl">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Complete payment to unlock</h1>
              <p className="mt-3 text-sm text-slate-700">
                We&apos;ve saved your responses. Checkout unlocks the full premium breakdown for this attempt.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/checkout?attemptId=${encodeURIComponent(attempt.id)}`)}
                className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"
              >
                Go to checkout
              </button>
            </div>

            {isFirebaseConfigured() ? (
              <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
                Optional: use <strong className="text-slate-800">Link Google</strong> in the top bar to keep this attempt
                on your account.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white scheme-light text-slate-900">
      <ResultsTopBar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest paid spotlight</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{arch?.label ?? "Your profile"}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">{arch?.summary}</p>
          </div>
          <div className="md:w-80">
            <div className="rounded-3xl bg-linear-to-br from-[#061238] via-[#071746] to-[#031132] p-[1px] shadow-[0_30px_80px_-30px_rgba(12,25,78,.6)]">
              <div className="rounded-3xl bg-linear-to-br from-[#081633] to-[#040814] p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Snapshot</div>
                <div className="mt-3 text-sm text-white/75">
                  {(() => {
                    const iso = attempt.paidAtIso ?? attempt.createdAtIso;
                    return iso ? new Date(iso).toLocaleString() : "—";
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-[#1b3a76]/60 bg-linear-to-br from-[#071132] via-[#0c1c45] to-[#050816] p-8 text-white shadow-[0_42px_100px_-40px_rgba(125,216,255,0.22)] ring-2 ring-[#274f8f]/40">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7dd8ff]/85">Dimensional breakdown</p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-white">Trait meters</h2>
          </div>
          <div className="mt-8 space-y-5">
            {dimensionRows.length === 0 ? (
              <p className="text-sm text-white/55">No dimension aggregates available for this snapshot.</p>
            ) : (
              dimensionRows.map(({ key, label, pct }, idx) => {
                const hues = ["#61aaff", "#7dd8ff", "#93daff", "#5fd4ff"] as const;
                const c = hues[idx % hues.length];
                const c2 = hues[(idx + 1) % hues.length];
                return (
                  <div key={key}>
                    <div className="flex justify-between gap-3 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                      <span>{label}</span>
                      <span className="font-bold tabular-nums text-[#dfefff]">{pct}%</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/[0.08] ring ring-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${c} 0%, ${c2} 100%)`,
                          boxShadow: "0 0 18px rgba(125, 216, 255, 0.35)",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-10">
          <ResultsStoryPosterSection
            poster={storyPoster}
            filenameSlug={`results-${attemptId}`}
            shareSnippetUrl={shareUrl}
            participant={
              hasGoogleIdentity && user
                ? {
                    displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Member",
                    googlePhotoUrl: user.photoURL ?? null,
                  }
                : null
            }
          />
        </div>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Playbook</h2>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2">
            {(arch?.bullets ?? []).map((b) => (
              <li key={b} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#61aaff] to-[#7dd8ff] text-[11px] font-bold text-[#061018]">
                  ✓
                </span>
                <span className="text-sm leading-relaxed text-slate-700">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {shareUrl && (
          <div className="mt-8 rounded-3xl bg-linear-to-r from-[#0b47ff] via-[#4a7dff] to-[#20b7ff] p-6 text-white shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/80">Share (latest only)</div>
                <div className="mt-2 break-all text-sm text-white/95">{shareUrl}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyShare()}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring ring-white/30"
                >
                  Copy link
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `My Pausible fitness behavioral spotlight: ${shareUrl}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring ring-white/30"
                >
                  Share on X
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Pausible results: ${shareUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring ring-white/30"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold text-slate-900">Private history</h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Not shareable</span>
          </div>
          <div className="mt-4 space-y-3">
            {history.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => router.push(`/results/${row.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:border-slate-300"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {new Date(row.createdAtIso ?? "").toLocaleString()} · {row.paymentStatus}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">{row.id.slice(0, 10)}…</div>
                </div>
                {row.id === attemptId ? <span className="text-xs font-semibold text-sky-600">Viewing</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/assessment/default"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-900"
          >
            Retake (new payment)
          </Link>
          <Link href="/" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
