import { ActiveAssessmentCards } from "@/components/marketing/ActiveAssessmentCards";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="px-4 py-10 sm:px-6 sm:py-12 lg:py-14 max-sm:flex max-sm:min-h-[calc(100dvh-10.75rem)] max-sm:flex-col max-sm:py-0 max-sm:pb-[env(safe-area-inset-bottom,0px)]"
      id="top"
      aria-labelledby="hero-heading"
    >
      {/* Middle wrapper must be column flex on small screens — row + flex-1 only grows width (bug caused white gap below). */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center max-sm:min-h-0 max-sm:flex-1">
        <div className="w-full rounded-2xl bg-linear-to-b from-[#050816] via-[#0a1029] to-[#081018] px-4 pb-12 pt-9 text-center shadow-[0_28px_72px_-28px_rgba(15,23,42,.5)] ring-1 ring-white/[0.06] max-sm:-mx-4 max-sm:flex max-sm:w-[calc(100%+2rem)] max-sm:min-h-0 max-sm:max-w-none max-sm:flex-1 max-sm:flex-col max-sm:rounded-none max-sm:px-5 max-sm:pb-[calc(2.75rem+env(safe-area-inset-bottom))] max-sm:pt-[max(1.75rem,env(safe-area-inset-top,0px))] max-sm:shadow-none max-sm:ring-0 sm:rounded-3xl sm:px-9 sm:pb-16 sm:pt-12 sm:shadow-[0_32px_80px_-24px_rgba(15,23,42,.55)]">
          <div className="flex min-h-0 flex-1 flex-col max-sm:min-h-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 sm:text-[11px] sm:tracking-[0.2em]">
              Pausible insights
            </div>
            <h1
              id="hero-heading"
              className="mx-auto mt-5 max-w-[22rem] text-balance text-[1.35rem] font-semibold leading-snug tracking-tight text-white sm:mt-7 sm:max-w-none sm:text-5xl sm:leading-[1.08] lg:text-[3.2rem] lg:leading-[1.1]"
            >
              Understand how you behave around{" "}
              <span className="bg-linear-to-r from-[#7dd8ff] to-[#61aaff] bg-clip-text text-transparent">
                fitness, focus, & follow-through.
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-[13px] leading-[1.65] text-white/75 sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-relaxed">
              A structured behavioral profile with honest scoring—not vibes. Finish in minutes, unlock the full breakdown
              when you&apos;re ready, and revisit your history privately whenever you reassess.
            </p>

            {/* One block anchored with mt-auto — uses extra viewport height intentionally (no stranded white slab) */}
            <div className="mt-8 flex flex-col items-stretch gap-3.5 max-sm:mt-auto max-sm:shrink-0 max-sm:pt-8 sm:mt-10 sm:items-center sm:gap-4">
              <TrackedAssessmentLink
                href={ctaHref}
                placement="hero_primary_cta"
                className="inline-flex w-full max-w-none items-center justify-center rounded-full bg-white px-5 py-3.5 text-[15px] font-semibold text-[#061018] shadow-md ring-2 ring-white/25 transition hover:bg-slate-100 sm:w-auto sm:max-w-md sm:bg-slate-950 sm:px-8 sm:text-base sm:text-white sm:shadow-lg sm:shadow-slate-950/40 sm:ring-white/5 sm:hover:-translate-y-px sm:hover:bg-black"
              >
                Start assessment
                <span className="pl-2 text-lg leading-none sm:text-xl" aria-hidden>
                  ↗
                </span>
              </TrackedAssessmentLink>
              <p className="text-center text-[11px] leading-relaxed text-white/58 sm:max-w-lg sm:text-sm sm:text-white/58">
                No login required to begin. Checkout unlocks the full breakdown.&nbsp;
                <a href="#faq" className="inline font-medium text-[#9ae4ff] underline decoration-white/30 underline-offset-[3px]">
                  Payments FAQ →
                </a>
              </p>
              <ActiveAssessmentCards />
              <a
                href="#journey"
                className="mt-10 hidden items-center justify-center gap-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/38 transition-colors hover:text-white/55 focus-visible:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7dd8ff]/50 max-sm:flex sm:hidden"
              >
                <span className="h-px w-8 shrink-0 bg-linear-to-r from-transparent to-white/35" aria-hidden />
                How it works
                <span className="h-px w-8 shrink-0 bg-linear-to-l from-transparent to-white/35" aria-hidden />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
