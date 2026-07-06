"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { listMyAttempts } from "@/lib/data/attempt-service";
import type { SerializedAttempt } from "@/lib/local/attempts";
import {
  formatAttemptListDate,
  paymentStatusLabel,
  resolveAttemptDisplayName,
} from "@/lib/results/attempt-display-name";
import { BrandLogo } from "@/components/BrandLogo";
import {
  APP_BODY,
  APP_HEADING_MD,
  APP_LINK_BACK,
  APP_PAGE_BG_SOFT,
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
  FORM_CARD_CLASS,
} from "@/components/marketing/marketing-brand";
import type { User } from "firebase/auth";

function hasGoogleResultsIdentity(user: User | null) {
  return Boolean(user && !user.isAnonymous && user.email);
}

export function MyResultsNavLink({ layout = "toolbar" }: { layout?: "toolbar" | "drawer" }) {
  const { ready, effectiveUid, user } = useFirebaseAuth();
  if (!ready || !effectiveUid) return null;
  if (isFirebaseConfigured() && !hasGoogleResultsIdentity(user)) return null;
  const toolbarCls = "hidden text-sm font-semibold text-[#4D4D4D] hover:text-[#0D1B2A] sm:inline";
  const drawerCls =
    "block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#0D1B2A] hover:bg-[#F7F9FB]";
  return (
    <Link href="/me" className={layout === "drawer" ? drawerCls : toolbarCls}>
      My results
    </Link>
  );
}

export function MyResultsHub() {
  const router = useRouter();
  const { effectiveUid, ready, linkGoogle, signInWithGoogle, user, signOut } = useFirebaseAuth();
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
    return <div className={`p-12 text-center ${APP_BODY}`}>Loading…</div>;
  }

  if (mustUseGoogle && !hasGoogleIdentity) {
    return (
      <div className={`mx-auto max-w-lg px-4 py-20 text-center ${APP_PAGE_BG_SOFT}`}>
        <Link href="/" className={APP_LINK_BACK}>
          ← Home
        </Link>
        <h1 className={`mt-4 ${APP_HEADING_MD}`}>Sign in to view your history</h1>
        <p className={`mt-2 ${APP_BODY}`}>
          Link or sign in with Google to load your assessments from this deployment.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          {user?.isAnonymous ? (
            <button type="button" onClick={() => void linkGoogle()} className={CTA_PRIMARY_CLASS}>
              Link Google
            </button>
          ) : (
            <button type="button" onClick={() => void signInWithGoogle()} className={CTA_PRIMARY_CLASS}>
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
        <p className={APP_BODY}>Sign in wasn’t restored for this browser session.</p>
        <Link href="/" className={`mt-4 inline-block font-semibold ${APP_LINK_BACK}`}>
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className={`${APP_PAGE_BG_SOFT} px-3 py-10 sm:px-4`}>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <Link href="/" className={`inline-flex items-center gap-2 font-semibold ${APP_LINK_BACK}`}>
              ← Home
            </Link>
            <h1 className={`mt-4 ${APP_HEADING_MD}`}>Your assessments</h1>
            <p className={`mt-2 ${APP_BODY}`}>
              Paid attempts unlock the full playbook. Only your <strong>latest paid</strong> run can expose a spotlight
              link—past entries stay private in this history.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
            {hasGoogleIdentity ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className={`${CTA_SECONDARY_CLASS} !min-h-[36px] !px-3.5 !py-2 !text-xs hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800`}
              >
                Log out
              </button>
            ) : null}
            <BrandLogo sizeClass="text-lg sm:text-xl" />
          </div>
        </header>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {rows.length === 0 ? (
            <p className={`${FORM_CARD_CLASS} p-8 text-center ${APP_BODY}`}>
              No attempts yet.&nbsp;
              <Link href="/assessment/default" className={`font-semibold ${APP_LINK_BACK}`}>
                Start an assessment →
              </Link>
            </p>
          ) : (
            rows.map((row) => {
              const title = resolveAttemptDisplayName(row);
              const dateLabel = formatAttemptListDate(row.createdAtIso);
              const statusLabel = paymentStatusLabel(row.paymentStatus);

              return (
                <div key={row.id} className={`${FORM_CARD_CLASS} flex flex-wrap items-start justify-between gap-4 p-5`}>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold leading-snug text-[#0D1B2A] sm:text-lg">{title}</h2>
                    <p className={`mt-1 ${APP_BODY} !text-sm`}>
                      {dateLabel}
                      <span className="text-slate-400"> · </span>
                      {statusLabel}
                      {row.paidAtIso ? (
                        <>
                          <span className="text-slate-400"> · </span>
                          Paid {formatAttemptListDate(row.paidAtIso)}
                        </>
                      ) : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      {row.paymentStatus === "paid" ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-900">Unlocked results</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-950">Needs payment</span>
                      )}
                      {row.paymentStatus === "paid" && row.isLatestShareEligible ? (
                        <span className="rounded-full bg-[#00C9C8]/15 px-3 py-1 text-[#00A8A7]">Latest share spotlight</span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/results/${row.id}`)}
                    className={`shrink-0 ${CTA_PRIMARY_CLASS} !min-h-[40px] !px-4 !py-2 !text-sm`}
                  >
                    Open
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
