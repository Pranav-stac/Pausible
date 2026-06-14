"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { loadProfileDraft, saveProfileDraft } from "@/lib/assessment/session-recovery";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { loadUserDemographics, saveUserDemographics } from "@/lib/firebase/user-demographics";
import { ageYearsToRange, type ProfileAgeRange, type ProfileGender } from "@/lib/profile/demographics-options";
import { PROFILE_GENDER_OPTIONS } from "@/lib/profile/demographics-options";

function ageFromDateOfBirth(isoDate: string, now = new Date()): number | undefined {
  const born = new Date(isoDate);
  if (Number.isNaN(born.getTime())) return undefined;
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  if (age < 0 || age > 120) return undefined;
  return age;
}

export function ProfileForm() {
  const router = useRouter();
  const { user, ready, hasGoogleIdentity, linkOrSignInWithGoogle } = useFirebaseAuth();
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [demographicsSource, setDemographicsSource] = useState<"google" | "manual" | undefined>();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const maxDob = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function hydrate() {
      const draft = loadProfileDraft();
      let name = draft?.displayName ?? user?.displayName ?? "";
      let dob = draft?.dateOfBirth ?? "";
      let genderValue = draft?.gender ?? "";
      let source: "google" | "manual" | undefined;

      if (user?.uid && hasGoogleIdentity) {
        const stored = await loadUserDemographics(user.uid);
        if (cancelled) return;
        if (stored?.dateOfBirth) dob = stored.dateOfBirth;
        if (stored?.gender) genderValue = stored.gender;
        source = stored?.demographicsSource;
        if (!name && user.displayName) name = user.displayName;
      }

      setDisplayName(name);
      setDateOfBirth(dob);
      setGender(genderValue);
      setDemographicsSource(source);
      setLoadingProfile(false);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.uid, user?.displayName, hasGoogleIdentity]);

  async function onGoogleSignIn() {
    setGoogleBusy(true);
    try {
      const outcome = await linkOrSignInWithGoogle();
      if (outcome !== "completed") return;

      const signedIn = getFirebaseAuth()?.currentUser;
      if (signedIn?.displayName) setDisplayName(signedIn.displayName);
      if (!signedIn?.uid) return;

      const stored = await loadUserDemographics(signedIn.uid);
      if (stored?.dateOfBirth) setDateOfBirth(stored.dateOfBirth);
      if (stored?.gender) setGender(stored.gender);
      if (stored?.demographicsSource) setDemographicsSource(stored.demographicsSource);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = displayName.trim() || "Your profile";
    const ageYears = dateOfBirth ? ageFromDateOfBirth(dateOfBirth) : undefined;
    const ageRange = ageYears != null ? ageYearsToRange(ageYears) : undefined;

    saveProfileDraft({
      displayName: trimmedName,
      dateOfBirth: dateOfBirth || undefined,
      ageRange,
      gender: gender || undefined,
    });

    if (user?.uid && hasGoogleIdentity) {
      await saveUserDemographics(user.uid, {
        dateOfBirth: dateOfBirth || undefined,
        ageRange: ageRange as ProfileAgeRange | undefined,
        gender: (gender || undefined) as ProfileGender | undefined,
        demographicsSource: "manual",
      });
    }

    router.push("/assessment/default");
  }

  const googleFilledDemographics =
    demographicsSource === "google" && Boolean(dateOfBirth && gender);

  return (
    <main className="min-h-screen bg-[#f7f8fa] scheme-light">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="shrink-0 rounded-lg outline-offset-4">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-lg" />
          </Link>
          <Link href="/intro" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
          <div className="lg:pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Your profile</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              A few details before we begin
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
              Sign in with Google to pre-fill your name. Date of birth and gender can be imported from your Google
              account when you&apos;ve added them there — otherwise enter them below.
            </p>
            <ul className="mt-8 hidden max-w-sm space-y-3 text-sm text-slate-600 lg:block">
              <li className="flex gap-2">
                <span className="text-sky-600">✓</span>
                Used on your report cover and coaching sections
              </li>
              <li className="flex gap-2">
                <span className="text-sky-600">✓</span>
                Never shared without your consent
              </li>
              <li className="flex gap-2">
                <span className="text-sky-600">✓</span>
                You can update details when you retake
              </li>
            </ul>
          </div>

          <form
            onSubmit={(e) => void onSubmit(e)}
            className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 sm:p-8 lg:max-w-xl lg:justify-self-end"
          >
            {!hasGoogleIdentity ? (
              <div className="mb-6 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-4">
                <p className="text-sm text-slate-700">Sign in with Google to save your results and pre-fill your profile.</p>
                <button
                  type="button"
                  disabled={googleBusy || !ready}
                  onClick={() => void onGoogleSignIn()}
                  className="mt-3 w-full cursor-pointer rounded-full border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {googleBusy ? "Signing in…" : "Sign in with Google"}
                </button>
              </div>
            ) : user?.email ? (
              <p className="mb-5 text-xs font-medium text-slate-500">Signed in as {user.email}</p>
            ) : null}

            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loadingProfile}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-sky-300 focus:ring-2 disabled:opacity-60"
                  placeholder="How should we address you?"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Date of birth</span>
                  <input
                    type="date"
                    value={dateOfBirth}
                    max={maxDob}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      setDemographicsSource("manual");
                    }}
                    required
                    disabled={loadingProfile}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Gender</span>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value);
                      setDemographicsSource("manual");
                    }}
                    required
                    disabled={loadingProfile}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 disabled:opacity-60"
                  >
                    <option value="">Select…</option>
                    {PROFILE_GENDER_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {googleFilledDemographics ? (
                <p className="text-xs text-slate-500">
                  Date of birth and gender were imported from your Google account. You can change them above.
                </p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={loadingProfile}
              className="mt-8 w-full cursor-pointer rounded-full bg-slate-950 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start assessment →
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
