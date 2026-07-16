"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  APP_BODY,
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
  FORM_CARD_CLASS,
  INPUT_CLASS,
} from "@/components/marketing/marketing-brand";

function GoogleLogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const compactInput =
  `${INPUT_CLASS} !mt-1 !rounded-lg !px-3 !py-2 !text-sm`;

export function AssessmentLoginPromptDialog({
  open,
  busy,
  error,
  onClose,
  onSignInWithGoogle,
  onSignInWithEmail,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSignInWithGoogle: () => void;
  onSignInWithEmail: (email: string, password: string, mode: "sign-in" | "register") => void;
}) {
  const titleId = useId();
  const descId = useId();
  const googleRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"sign-in" | "register">("sign-in");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    googleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setEmailMode("sign-in");
    }
  }, [open]);

  if (!open) return null;

  const emailSubmitDisabled = busy || !email.trim() || password.length < 6;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="presentation"
    >
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
        className={`relative flex max-h-[min(100dvh-1.5rem,640px)] w-full max-w-md flex-col overflow-y-auto ${FORM_CARD_CLASS} !rounded-2xl !p-4 sm:!p-5`}
      >
        <div className="mb-3 flex justify-center">
          <BrandLogo heightClass="h-7 sm:h-8" />
        </div>

        <h2 id={titleId} className="text-center text-xl font-bold tracking-tight text-[#0D1B2A] sm:text-2xl">
          Sign in to continue
        </h2>
        <p id={descId} className={`mt-1 text-center !text-sm !leading-snug ${APP_BODY}`}>
          Save your results and pick up where you left off.
        </p>

        {error ? (
          <p className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-center text-xs text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          <button
            ref={googleRef}
            type="button"
            disabled={busy}
            onClick={() => onSignInWithGoogle()}
            className={`flex w-full items-center justify-center gap-2.5 ${CTA_SECONDARY_CLASS} !min-h-[42px] !rounded-xl !px-4 !py-2 !text-sm disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <GoogleLogoMark className="h-4 w-4" />
            {busy ? "Working…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-medium text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form
            className="space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (emailSubmitDisabled) return;
              onSignInWithEmail(email.trim(), password, emailMode);
            }}
          >
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
                className={compactInput}
                placeholder="you@example.com"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">Password</span>
              <input
                type="password"
                autoComplete={emailMode === "register" ? "new-password" : "current-password"}
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
                className={compactInput}
                placeholder="At least 6 characters"
              />
            </label>
            <button
              type="submit"
              disabled={emailSubmitDisabled}
              className={`w-full ${CTA_PRIMARY_CLASS} !min-h-[42px] !rounded-xl !px-5 !py-2.5 !text-sm disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {busy ? "Working…" : emailMode === "register" ? "Create account" : "Sign in with email"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEmailMode((m) => (m === "sign-in" ? "register" : "sign-in"))}
              className="w-full cursor-pointer text-center text-xs font-medium text-sky-700 transition hover:text-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {emailMode === "sign-in"
                ? "Need an account? Create one with email"
                : "Already have an account? Sign in"}
            </button>
          </form>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onClose()}
          className="mt-3 w-full cursor-pointer text-center text-xs font-medium text-slate-500 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
