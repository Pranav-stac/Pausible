"use client";

import { useEffect, useId, useRef } from "react";

export function AssessmentLoginPromptDialog({
  open,
  busy,
  error,
  onClose,
  onSignIn,
  onContinueWithoutAccount,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSignIn: () => void;
  onContinueWithoutAccount: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const continueRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        disabled={busy}
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.25)] sm:p-8"
      >
        <h2 id={titleId} className="text-center text-xl font-semibold tracking-tight text-slate-900">
          Sign in before you start?
        </h2>
        <p id={descId} className="mt-3 text-center text-sm leading-relaxed text-slate-600">
          Optional — sign in with Google to save results to your account, or continue without an account and sign in
          later after you finish.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSignIn()}
            className="w-full rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-50"
          >
            {busy ? "Working…" : "Sign in with Google"}
          </button>
          <button
            ref={continueRef}
            type="button"
            disabled={busy}
            onClick={() => onContinueWithoutAccount()}
            className="w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            Continue without account
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onClose()}
          className="mt-4 w-full text-center text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
