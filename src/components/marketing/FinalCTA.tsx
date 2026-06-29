import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

export function FinalCTA({ href }: { href: string }) {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="pausibl-mesh-cta relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-[0_24px_60px_-12px_rgba(45,130,255,0.4)] sm:px-12 sm:py-16 lg:rounded-[2rem] lg:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            aria-hidden
            style={{
              background:
                "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.25) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.15) 0%, transparent 40%)",
            }}
          />

          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
              Ready to meet your wellness persona?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/90 sm:text-lg">
              Pause. Reflect. Accelerate. Your first step takes 15–20 minutes — and it finally fits you.
            </p>

            <TrackedAssessmentLink
              href={href}
              placement="final_cta"
              className="mt-8 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[#2D82FF] shadow-lg transition hover:bg-white/95 hover:shadow-xl"
            >
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </TrackedAssessmentLink>

            <p className="mt-5 text-sm text-white/75">Takes 15–20 minutes · No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
