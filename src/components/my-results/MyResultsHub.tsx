"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { listMyAttempts } from "@/lib/data/attempt-service";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { BrandLogo } from "@/components/BrandLogo";
import type { User } from "firebase/auth";

function hasGoogleResultsIdentity(user: User | null) {
  return Boolean(user && !user.isAnonymous && user.email);
}

export function MyResultsNavLink({ layout = "toolbar" }: { layout?: "toolbar" | "drawer" }) {
  const { ready, effectiveUid, user } = useFirebaseAuth();
  if (!ready || !effectiveUid) return null;
  if (isFirebaseConfigured() && !hasGoogleResultsIdentity(user)) return null;
  const toolbarCls = "hidden text-sm font-semibold text-slate-700 hover:text-slate-950 sm:inline";
  const drawerCls =
    "block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50";
  return (
    <Link href="/me" className={layout === "drawer" ? drawerCls : toolbarCls}>
      My results
    </Link>
  );
}

export function MyResultsHub() {
  const router = useRouter();
  const { effectiveUid, ready, linkGoogle, signInWithGoogle, user } = useFirebaseAuth();
  const hasGoogleIdentity = hasGoogleResultsIdentity(user);
  const mustUseGoogle = isFirebaseConfigured();

  const [rows, setRows] = useState<SerializedAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!effectiveUid) return;
    try {
      const all = await listMyAttempts(effectiveUid);
      setRows(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history");
    }
  }, [effectiveUid]);

  useEffect(() => {
    if (!effectiveUid || (mustUseGoogle && !hasGoogleIdentity)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async history load mirrors ResultsClient reload
    void load();
  }, [effectiveUid, hasGoogleIdentity, load, mustUseGoogle]);

  if (!ready) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading…</div>;
  }

  if (mustUseGoogle && !hasGoogleIdentity) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Link href="/" className="text-sm font-semibold text-sky-600">
          ← Home
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Sign in to view your history</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Link or sign in with Google to load your assessments from this deployment.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {user?.isAnonymous ? (
            <button
              type="button"
              onClick={() => void linkGoogle()}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
            >
              Link Google
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!effectiveUid) {
    return (
      <div className="mx-auto max-w-lg px-3 py-20 text-center">
        <p className="text-sm text-slate-600">Sign in wasn’t restored for this browser session.</p>
        <Link href="/" className="mt-4 inline-block font-semibold text-sky-600">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white px-3 py-10 sm:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 font-semibold text-sky-700">
              ← Home
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Your assessments</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Paid attempts unlock the full playbook. Only your <strong>latest paid</strong> run can expose a spotlight
              link—past entries stay private in this history.
            </p>
          </div>
          <BrandLogo heightClass="h-8 sm:h-9" withWordmark wordmarkClassName="text-lg" />
        </header>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              No attempts yet.&nbsp;
              <Link href="/assessment/default" className="font-semibold text-sky-700">
                Start an assessment →
              </Link>
            </p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {row.assessmentId} · {row.paymentStatus}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-500">{row.id}</div>
                  <div className="mt-2 text-sm text-slate-700">
                    Started {row.createdAtIso ? new Date(row.createdAtIso).toLocaleString() : "—"}
                    {row.paidAtIso ? ` · Paid ${new Date(row.paidAtIso).toLocaleString()}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                    {row.paymentStatus === "paid" ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">Unlocked results</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950">Needs payment</span>
                    )}
                    {row.paymentStatus === "paid" && row.isLatestShareEligible ? (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-950">Latest share spotlight</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/results/${row.id}`)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Open
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
