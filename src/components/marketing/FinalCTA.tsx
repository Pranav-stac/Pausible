"use client";

import { ArrowRight } from "@/components/marketing/icons";
import { MarketingReveal } from "@/components/marketing/MarketingReveal";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { MARKETING_CONTAINER } from "@/components/marketing/marketing-brand";

export function FinalCTA({ href }: { href: string }) {
  return (
    <section id="start" className="scroll-mt-20 bg-white">
      <div className={`${MARKETING_CONTAINER} px-6 py-[104px] sm:px-6`}>
        <MarketingReveal>
          <div className="relative overflow-hidden rounded-[32px] bg-[image:var(--marketing-grad)] px-7 py-12 text-center shadow-[0_40px_90px_-36px_rgba(2,132,199,0.55)] sm:px-[72px] sm:py-20">
            <div
              className="pointer-events-none absolute -top-20 -right-10 h-[280px] w-[280px] rounded-full bg-white/18 blur-[20px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-[120px] -left-[60px] h-[320px] w-[320px] rounded-full bg-white/12 blur-[20px]"
              aria-hidden
            />

            <div className="relative mx-auto max-w-2xl">
              <h2 className="text-balance text-[clamp(30px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.02em] text-white">
                Ready to meet your wellness persona?
              </h2>
              <p className="mx-auto mt-[18px] max-w-[520px] text-pretty text-[clamp(17px,1.5vw,20px)] leading-[1.6] text-white/92">
                Pause. Reflect. Accelerate. Your first step takes 15–20 minutes — and it finally fits you.
              </p>

              <TrackedAssessmentLink
                href={href}
                placement="final_cta"
                className="mt-9 inline-flex min-h-[56px] items-center justify-center gap-2 rounded-[14px] bg-white px-[38px] py-[17px] text-lg font-bold text-[#0284C7] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.3)] transition hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="h-[18px] w-[18px]" />
              </TrackedAssessmentLink>

              <p className="mt-5 text-sm font-medium text-white/85">Takes 15–20 minutes · No credit card required</p>
            </div>
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
