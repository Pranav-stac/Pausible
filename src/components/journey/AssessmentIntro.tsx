import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const STEPS = [
  {
    n: "01",
    title: "Personality assessment",
    detail: "90 questions across five traits — scroll at your own pace. Progress saves automatically.",
    time: "~15 min",
  },
  {
    n: "02",
    title: "Wellness context",
    detail: "Sleep, stress, goals, and barriers — a short section so recommendations fit your life.",
    time: "2–3 min",
  },
  {
    n: "03",
    title: "Your intelligence report",
    detail: "Behavioral pattern, blind spots, high-impact opportunities, and a four-pillar action plan.",
    time: "Instant",
  },
] as const;

export function AssessmentIntro() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] scheme-light">
      {/* Top bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="shrink-0 rounded-lg outline-offset-4">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-lg" />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-20">
          {/* Left — narrative */}
          <div className="lg:pt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Assessment intro</p>
            <h1 className="mt-4 max-w-xl text-[2rem] font-black leading-[1.12] tracking-tight text-slate-950 sm:text-4xl lg:text-[2.75rem]">
              Your wellness intelligence profile
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed">
              In about 15–20 minutes, you&apos;ll complete a structured personality assessment and a short wellness
              questionnaire. We translate your answers into a personalized report — behavioral pattern, blind spots,
              and a four-pillar action plan built for how you actually operate.
            </p>

            <div className="mt-8 hidden flex-wrap items-center gap-4 sm:flex">
              <Link
                href="/profile"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Get started
                <span className="ml-1.5" aria-hidden>
                  →
                </span>
              </Link>
              <p className="text-sm text-slate-500">No payment required to begin · progress auto-saved</p>
            </div>
          </div>

          {/* Right — step cards */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.12)] ring-1 ring-slate-100 sm:p-8 lg:p-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">What to expect</p>
            <ul className="mt-6 space-y-4">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:gap-5 sm:p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-black text-white">
                    {step.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="text-sm font-bold text-slate-950 sm:text-base">{step.title}</h2>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        {step.time}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-relaxed text-slate-500">
              Close the tab anytime — when you return, we pick up where you left off.
            </p>
          </div>
        </div>

        {/* Mobile / narrow CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:hidden">
          <Link
            href="/profile"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-8 text-sm font-semibold text-white shadow-sm"
          >
            Get started →
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
