"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { fetchAttempt, finalizeAttemptPayment } from "@/lib/data/attempt-service";
import { fetchAssessment } from "@/lib/data/assessment-service";
import { publishShareSnapshot } from "@/lib/data/share-service";
import { randomShareToken } from "@/lib/share-token";
import { useAssessmentPrice } from "@/lib/hooks/useAssessmentPrice";
import { formatInr, lookupDiscountPercent, priceAfterDiscount } from "@/lib/pricing";
import { readStoredReferral } from "@/components/ReferralCapture";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { trackCheckoutOpen, trackPurchaseComplete } from "@/lib/analytics/track";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const u = auth?.currentUser;
  if (!u) return null;
  return u.getIdToken();
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export function CheckoutClient({ bootstrapPriceInr }: { bootstrapPriceInr: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const attemptId = params.get("attemptId");
  const { effectiveUid, ready } = useFirebaseAuth();

  const [referral, setReferral] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const storedRef = useMemo(() => readStoredReferral(), []);
  const percentOff = useMemo(() => lookupDiscountPercent(referral || storedRef), [referral, storedRef]);
  const listPrice = useAssessmentPrice(bootstrapPriceInr);
  const amount = priceAfterDiscount(listPrice, percentOff);

  const lastCheckoutOpenAttempt = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !effectiveUid || !attemptId) return;
    if (lastCheckoutOpenAttempt.current === attemptId) return;
    lastCheckoutOpenAttempt.current = attemptId;
    const path =
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/checkout";
    void trackCheckoutOpen({ uid: effectiveUid, attemptId, path });
  }, [attemptId, effectiveUid, ready]);

  const completeDevOnClient = useCallback(async () => {
    if (!attemptId || !effectiveUid) return;
    const attempt = await fetchAttempt(attemptId);
    if (!attempt || attempt.uid !== effectiveUid) throw new Error("Attempt not found for this session");
    const assessment = await fetchAssessment(attempt.assessmentId);
    if (!assessment) throw new Error("Assessment not found or inactive");
    const token = randomShareToken();
    await finalizeAttemptPayment({
      uid: effectiveUid,
      attemptId,
      shareToken: token,
      paymentProvider: "dev",
      paymentId: `dev_${Date.now()}`,
    });
    const paid = await fetchAttempt(attemptId);
    if (paid) await publishShareSnapshot(assessment, paid, token);
    const path = typeof window !== "undefined" ? window.location.pathname : "/checkout";
    void trackPurchaseComplete({ uid: effectiveUid, attemptId, path, provider: "dev" });
    router.push(`/results/${encodeURIComponent(attemptId)}`);
  }, [attemptId, effectiveUid, router]);

  const runDev = useCallback(async () => {
    if (!attemptId || !effectiveUid) return;
    setBusy("dev");
    setError(null);
    try {
      await completeDevOnClient();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }, [attemptId, effectiveUid, completeDevOnClient]);

  const runHosted = useCallback(
    async (provider: "stripe" | "razorpay" | "paypal") => {
      if (!attemptId || !effectiveUid) return;
      setBusy(provider);
      setError(null);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (isFirebaseConfigured()) {
          const token = await getIdToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch("/api/checkout/create", {
          method: "POST",
          headers,
          body: JSON.stringify({
            attemptId,
            provider,
            referralCode: referral || storedRef || undefined,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          url?: string;
          razorpay?: { keyId: string; orderId: string; amount: number; currency: string; name?: string };
        };

        if (!res.ok) throw new Error(data.error ?? "Unable to start checkout");

        if (data.url) {
          window.location.href = data.url;
          return;
        }

        if (provider === "razorpay" && data.razorpay) {
          await loadRazorpayScript();
          const R = window.Razorpay;
          if (!R) throw new Error("Razorpay failed to initialize");
          const rzp = new R({
            key: data.razorpay.keyId,
            amount: data.razorpay.amount,
            currency: data.razorpay.currency,
            order_id: data.razorpay.orderId,
            name: data.razorpay.name ?? "Pausible",
            description: "Fitness behavioral assessment",
            handler: () => {
              const path = typeof window !== "undefined" ? window.location.pathname : "/checkout";
              void trackPurchaseComplete({ uid: effectiveUid, attemptId, path, provider: "razorpay" });
              router.push(`/results/${encodeURIComponent(attemptId)}`);
            },
          });
          rzp.open();
          return;
        }

        throw new Error("Checkout not configured for this provider");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout failed");
      } finally {
        setBusy(null);
      }
    },
    [attemptId, effectiveUid, referral, router, storedRef],
  );

  if (!ready) {
    return <div className="px-1.5 py-16 text-center text-sm text-slate-500 sm:px-2">Preparing checkout…</div>;
  }

  if (!attemptId) {
    return (
      <div className="mx-auto max-w-lg px-1.5 py-16 text-center sm:px-2">
        <p className="text-sm text-slate-600">Missing attempt. Start from the assessment.</p>
        <Link href="/assessment/default" className="mt-4 inline-block text-sm font-semibold text-sky-600">
          Go to assessment
        </Link>
      </div>
    );
  }

  const devEnabled =
    process.env.NEXT_PUBLIC_DEV_PAYMENTS === "true" || process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white px-1.5 py-10 sm:px-2 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900" aria-label="Home">
          <span aria-hidden className="text-slate-500">
            ←
          </span>
          <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base" />
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">Checkout</h1>
        <p className="mt-2 text-sm text-slate-600">
          Unlock the full premium breakdown for this attempt. Retakes require a new payment each time.
        </p>

        <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due today</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{formatInr(amount)}</div>
              {percentOff > 0 && (
                <div className="mt-1 text-xs text-emerald-700">
                  {percentOff}% referral/discount applied (sample codes: WELCOME20, FRIEND15).
                </div>
              )}
            </div>
            <div className="text-right text-xs text-slate-500">
              Attempt{" "}
              <span className="font-mono text-[11px] text-slate-700">{attemptId.slice(0, 8)}…</span>
            </div>
          </div>

          <label className="mt-8 block text-sm font-semibold text-slate-800">
            Referral / discount code
            <input
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
              placeholder={storedRef ?? "Optional"}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="mt-10 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void runHosted("stripe")}
              className="rounded-2xl bg-slate-950 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "stripe" ? "…" : "Pay with Stripe"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void runHosted("razorpay")}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {busy === "razorpay" ? "…" : "Pay with Razorpay"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void runHosted("paypal")}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-900 disabled:opacity-50"
            >
              {busy === "paypal" ? "…" : "Pay with PayPal"}
            </button>
          </div>

          {devEnabled && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void runDev()}
              className="w-full rounded-2xl bg-linear-to-r from-emerald-600 to-emerald-500 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "dev" ? "…" : "Simulate successful payment (dev only)"}
            </button>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Configure provider keys in `.env` for production. Webhooks mark attempts paid server-side; the dev shortcut
          finalizes on-device for local testing (and for Firebase via client writes).
        </p>
      </div>
    </div>
  );
}
