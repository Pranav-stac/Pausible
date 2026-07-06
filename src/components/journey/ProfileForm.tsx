"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppPageShell } from "@/components/AppPageShell";
import {
  APP_BODY,
  APP_HEADING_LG,
  APP_MUTED,
  BRAND_ACCENT_TEXT,
  CTA_PRIMARY_FULL_CLASS,
  CTA_SECONDARY_CLASS,
  FORM_CARD_CLASS,
  INPUT_CLASS,
  INPUT_LABEL,
  LABEL_CLASS,
} from "@/components/marketing/marketing-brand";
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
    <AppPageShell backHref="/intro" contentClassName="!py-10 sm:!py-14 lg:!py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
        <div className="lg:pt-2">
          <p className={LABEL_CLASS}>Your profile</p>
          <h1 className={`mt-4 ${APP_HEADING_LG}`}>A few details before we begin</h1>
          <p className={`mt-4 max-w-md ${APP_BODY}`}>
            Sign in with Google to pre-fill your name. Date of birth and gender can be imported from your Google
            account when you&apos;ve added them there — otherwise enter them below.
          </p>
          <ul className={`mt-8 hidden max-w-sm space-y-3 lg:block ${APP_BODY} !text-sm`}>
            <li className="flex gap-2">
              <span className={BRAND_ACCENT_TEXT}>✓</span>
              Used on your report cover and coaching sections
            </li>
            <li className="flex gap-2">
              <span className={BRAND_ACCENT_TEXT}>✓</span>
              Never shared without your consent
            </li>
            <li className="flex gap-2">
              <span className={BRAND_ACCENT_TEXT}>✓</span>
              You can update details when you retake
            </li>
          </ul>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className={`${FORM_CARD_CLASS} p-6 sm:p-8 lg:max-w-xl lg:justify-self-end`}
        >
          {!hasGoogleIdentity ? (
            <div className="mb-6 rounded-2xl border border-[#00C9C8]/20 bg-[#F7F9FB] px-4 py-4">
              <p className={`${APP_BODY} !text-sm`}>
                Sign in with Google to save your results and pre-fill your profile.
              </p>
              <button
                type="button"
                disabled={googleBusy || !ready}
                onClick={() => void onGoogleSignIn()}
                className={`mt-3 ${CTA_SECONDARY_CLASS} w-full !min-h-[44px] !py-2.5 !text-sm disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {googleBusy ? "Signing in…" : "Sign in with Google"}
              </button>
            </div>
          ) : user?.email ? (
            <p className={`mb-5 ${APP_MUTED} !text-xs`}>Signed in as {user.email}</p>
          ) : null}

          <div className="space-y-5">
            <label className="block">
              <span className={INPUT_LABEL}>Name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile}
                className={INPUT_CLASS}
                placeholder="How should we address you?"
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className={INPUT_LABEL}>Date of birth</span>
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
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className={INPUT_LABEL}>Gender</span>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    setDemographicsSource("manual");
                  }}
                  required
                  disabled={loadingProfile}
                  className={INPUT_CLASS}
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
              <p className={`${APP_MUTED} !text-xs`}>
                Date of birth and gender were imported from your Google account. You can change them above.
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={loadingProfile}
            className={`mt-8 ${CTA_PRIMARY_FULL_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Start assessment →
          </button>
        </form>
      </div>
    </AppPageShell>
  );
}
