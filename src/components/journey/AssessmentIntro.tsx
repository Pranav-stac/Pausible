import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function AssessmentIntro() {
  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 via-white to-sky-50/40 scheme-light">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10 sm:px-8">
        <BrandLogo className="h-8 w-auto" />
        <div className="mt-12 flex flex-1 flex-col justify-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Assessment intro</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Your wellness intelligence profile
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-600">
            In about 15–20 minutes, you&apos;ll complete a structured personality assessment and a short wellness
            questionnaire. We&apos;ll translate your answers into a personalized report with your behavioral pattern,
            blind spots, and a four-pillar action plan.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="font-bold text-sky-600">1</span>
              <span>90 personality questions across five traits — scroll at your own pace</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-sky-600">2</span>
              <span>A quick context section on sleep, stress, goals, and barriers (2–3 minutes)</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-sky-600">3</span>
              <span>A full wellness intelligence report tailored to your profile</span>
            </li>
          </ul>
          <p className="mt-8 text-sm text-slate-500">
            Your progress is saved automatically. You can close the tab and return later.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/profile"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Get started
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
