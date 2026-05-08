"use client";

import { useState } from "react";

import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Landing / marketing: Sign in with Google, link Google when anonymous, or show email when signed in.
 */
export function NavAuthActions({ layout = "toolbar" }: { layout?: "toolbar" | "drawer" }) {
  const { user, ready, linkGoogle, signInWithGoogle, signOut } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!ready || !isFirebaseConfigured()) {
    return null;
  }

  const email = user?.email;
  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (email) {
    const logOutCls =
      layout === "drawer"
        ? "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/80 hover:text-rose-800 disabled:opacity-50"
        : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50 sm:px-3.5";

    return (
      <>
        <span
          className={
            layout === "drawer"
              ? "block w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              : "hidden max-w-[160px] truncate text-xs font-medium text-slate-600 sm:inline"
          }
          title={email}
        >
          {email}
        </span>
        <button type="button" onClick={() => void onSignOut()} disabled={signingOut} className={logOutCls}>
          {signingOut ? "…" : "Log out"}
        </button>
      </>
    );
  }
  const label = user?.isAnonymous ? "Link Google" : "Sign in";

  const onClick = async () => {
    setBusy(true);
    try {
      if (user?.isAnonymous) await linkGoogle();
      else await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className={
        layout === "drawer"
          ? "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:text-sm"
      }
    >
      {busy ? "…" : label}
    </button>
  );
}
