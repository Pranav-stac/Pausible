"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Landing / marketing: Sign in with Google, link Google when anonymous, or profile menu when signed in.
 */
export function NavAuthActions({ layout = "toolbar" }: { layout?: "toolbar" | "drawer" }) {
  const { user, ready, linkGoogle, signInWithGoogle, signOut } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const email = user?.email;

  useEffect(() => {
    if (!menuOpen || layout === "drawer") return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [layout, menuOpen]);

  if (!ready || !isFirebaseConfigured()) {
    return null;
  }

  const onSignOut = async () => {
    setSigningOut(true);
    setMenuOpen(false);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (email) {
    const itemCls =
      layout === "drawer"
        ? "block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-[#0D1B2A] hover:bg-[#F7F9FB]"
        : "block w-full px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50";
    const logoutCls =
      layout === "drawer"
        ? "w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/80 hover:text-rose-800 disabled:opacity-50"
        : "block w-full px-3.5 py-2.5 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50";

    const menuItems = (
      <>
        <Link href="/profile" className={itemCls} onClick={() => setMenuOpen(false)}>
          Profile
        </Link>
        <Link href="/me" className={itemCls} onClick={() => setMenuOpen(false)}>
          My results
        </Link>
        <button type="button" onClick={() => void onSignOut()} disabled={signingOut} className={logoutCls}>
          {signingOut ? "…" : "Log out"}
        </button>
      </>
    );

    if (layout === "drawer") {
      return (
        <div className="flex w-full flex-col gap-1">
          <p className="truncate px-3 pb-1 text-xs font-medium text-slate-500" title={email}>
            {email}
          </p>
          {menuItems}
        </div>
      );
    }

    const initial = (user?.displayName?.trim()?.[0] || email[0] || "?").toUpperCase();

    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Account menu"
          title={email}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google auth avatar URL
            <img src={user.photoURL} alt="" className="h-full w-full rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden>{initial}</span>
          )}
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            <div className="border-b border-slate-100 px-3.5 py-2.5">
              <p className="truncate text-xs font-medium text-slate-500" title={email}>
                {email}
              </p>
            </div>
            {menuItems}
          </div>
        ) : null}
      </div>
    );
  }

  const label = "Sign in";

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
