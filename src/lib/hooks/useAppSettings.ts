"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getFirebaseDb } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/** Public settings document used for free-vs-paid UX (requires Firestore enabled). */
export function useAppSettings(serverRequirePayment?: boolean | null) {
  const fromServer = typeof serverRequirePayment === "boolean";

  const [clientRequirePayment, setClientRequirePayment] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(!fromServer);

  useEffect(() => {
    if (fromServer) return;

    let cancelled = false;

    void (async () => {
      if (!isFirebaseConfigured()) {
        const free =
          typeof process.env.NEXT_PUBLIC_FREE_RESULTS !== "undefined" &&
          process.env.NEXT_PUBLIC_FREE_RESULTS === "true";
        if (!cancelled) {
          setClientRequirePayment(!free);
          setLoading(false);
        }
        return;
      }

      const db = getFirebaseDb();
      if (!db) {
        if (!cancelled) {
          setClientRequirePayment(true);
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, "app_settings", "global"));
        const req = snap.exists() ? (snap.data().requirePayment as boolean | undefined) !== false : true;
        if (!cancelled) {
          setClientRequirePayment(req);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setClientRequirePayment(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromServer]);

  const requirePayment = fromServer ? (serverRequirePayment as boolean) : (clientRequirePayment ?? true);

  const loadingOut = fromServer ? false : loading;

  return { requirePayment, loading: loadingOut };
}
