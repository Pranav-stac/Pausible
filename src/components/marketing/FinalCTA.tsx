import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { CTA_PRIMARY_CLASS, MARKETING_CONTAINER, MARKETING_SECTION } from "@/components/marketing/marketing-brand";

export function FinalCTA({ href }: { href: string }) {
  return (
    <section className={`${MARKETING_SECTION} bg-[#F7F9FB]`}>
      <div className={MARKETING_CONTAINER}>
        <div className="relative overflow-hidden rounded-3xl bg-[#0D1B2A] px-6 py-14 sm:px-12 sm:py-16 lg:rounded-[2rem] lg:py-20">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 0% 100%, rgb(0 201 200 / 0.18), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 0%, rgb(45 130 255 / 0.2), transparent 50%)",
            }}
          />

          <div className="relative max-w-2xl">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to meet your wellness persona?
            </h2>
            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-white/85 sm:text-lg">
              Pause. Reflect. Accelerate. Your first step takes 15–20 minutes, and it finally fits you.
            </p>

            <TrackedAssessmentLink
              href={href}
              placement="final_cta"
              className={`mt-8 ${CTA_PRIMARY_CLASS} !bg-white !text-[#2D82FF] ring-white/20 hover:!bg-white/95`}
            >
              Get started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </TrackedAssessmentLink>

            <p className="mt-5 text-sm text-white/65">Takes 15–20 minutes · No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
