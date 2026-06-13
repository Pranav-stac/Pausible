"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { saveProfileDraft } from "@/lib/assessment/session-recovery";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

const AGE_OPTIONS = ["under 18", "18-24", "25-34", "35-44", "45-54", "55+"];
const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];

export function ProfileForm() {
  const router = useRouter();
  const { user } = useFirebaseAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveProfileDraft({
      displayName: displayName.trim() || "Your profile",
      ageRange: ageRange || undefined,
      gender: gender || undefined,
    });
    router.push("/assessment/default");
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 via-white to-sky-50/40 scheme-light">
      <div className="mx-auto max-w-lg px-5 py-10 sm:px-8">
        <BrandLogo className="h-8 w-auto" />
        <h1 className="mt-10 text-2xl font-black text-slate-950">A few details before we begin</h1>
        <p className="mt-2 text-sm text-slate-600">This helps personalize your report. Takes under a minute.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-sky-300 focus:ring-2"
              placeholder="How should we address you?"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Age range</span>
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="">Select…</option>
              {AGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Gender</span>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-slate-950 py-3.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Start assessment
          </button>
        </form>
      </div>
    </main>
  );
}
