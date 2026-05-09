import { ActiveAssessmentCards } from "@/components/marketing/ActiveAssessmentCards";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-12 lg:pb-14 lg:pt-14" id="top" aria-labelledby="hero-heading">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-3xl border border-slate-200/90 bg-white px-5 py-8 text-center shadow-[0_20px_50px_-40px_rgba(15,23,42,0.1)] ring-1 ring-slate-100/80 sm:px-10 sm:py-12">
          <div className="flex flex-col">
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 sm:text-xs">Your behavioral profile</p>

            <h1
              id="hero-heading"
              className="mx-auto mt-4 max-w-xl text-balance text-[1.55rem] font-semibold leading-[1.22] tracking-tight text-slate-950 sm:mt-5 sm:max-w-none sm:text-5xl sm:leading-[1.08] lg:text-[3.2rem] lg:leading-[1.1]"
            >
              Understand how you behave around{" "}
              <span className="bg-linear-to-r from-sky-500 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                fitness, focus, & follow-through.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-lg text-pretty text-[14px] leading-relaxed text-slate-600 sm:mt-5 sm:max-w-2xl sm:text-base">
              A structured behavioral profile with honest scoring—not vibes. Finish in minutes, unlock the full breakdown
              when you&apos;re ready, and revisit your history privately whenever you reassess.
            </p>

            <div className="mt-7 flex flex-col items-center gap-4 sm:mt-10">
              <TrackedAssessmentLink
                href={ctaHref}
                placement="hero_primary_cta"
                className="inline-flex w-full min-h-[48px] max-w-md items-center justify-center rounded-full bg-slate-950 px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:max-w-none"
              >
                Take assessment
                <span className="pl-1" aria-hidden>
                  →
                </span>
              </TrackedAssessmentLink>

              <p className="text-center text-[12px] leading-relaxed text-slate-500 sm:max-w-lg sm:text-sm">
                No login required to begin.&nbsp;
                <a href="#faq" className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-[3px] hover:text-indigo-700">
                  Payments FAQ →
                </a>
              </p>

              <ActiveAssessmentCards />

              <a
                href="#journey"
                className="mt-2 flex items-center justify-center gap-3 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:mt-4 sm:hidden"
              >
                <span className="h-px w-8 shrink-0 bg-linear-to-r from-transparent to-slate-300" aria-hidden />
                How it works
                <span className="h-px w-8 shrink-0 bg-linear-to-l from-transparent to-slate-300" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
