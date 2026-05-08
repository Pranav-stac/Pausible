"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEFAULT_PRICE_INR, effectiveAssessmentPriceInr } from "@/lib/pricing";

/**
 * List price before referral discount — synced from `app_settings/global.priceInr` when Firebase is enabled.
 */
export function useAssessmentPrice(bootstrapHint: number): number {
  const [price, setPrice] = useState(() =>
    bootstrapHint >= 1 ? Math.round(bootstrapHint) : DEFAULT_PRICE_INR,
  );

  useEffect(() => {
    setPrice(bootstrapHint >= 1 ? Math.round(bootstrapHint) : DEFAULT_PRICE_INR);
  }, [bootstrapHint]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const db = getFirebaseDb();
    if (!db) return;

    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "app_settings", "global"));
        const stored = snap.exists() ? snap.data().priceInr : undefined;
        const resolved = effectiveAssessmentPriceInr(stored);
        if (!cancelled) setPrice(resolved);
      } catch {
        /* keep bootstrap */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return price;
}
