"use client";

import { MarketingReveal } from "@/components/marketing/MarketingReveal";
import { LABEL_CLASS, MARKETING_CONTAINER } from "@/components/marketing/marketing-brand";

export function VideoOverview() {
  return (
    <section
      className="scroll-mt-20 border-y border-[#F3F4F6] bg-[#F9FAFB]"
      id="overview"
      aria-labelledby="overview-heading"
    >
      <div className={`${MARKETING_CONTAINER} px-6 py-[88px] text-center sm:px-6`}>
        <MarketingReveal>
          <p className={LABEL_CLASS}>Watch the overview</p>
          <h2
            id="overview-heading"
            className="mx-auto mt-4 max-w-2xl text-balance text-[clamp(26px,3.4vw,40px)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]"
          >
            Meet Pausibl in 2 minutes
          </h2>
          <p className="mx-auto mt-4 max-w-[540px] text-pretty text-lg leading-[1.6] text-[#4B5563]">
            See how Wellness Intelligence translates your personality into a plan that actually sticks.
          </p>
        </MarketingReveal>

        <MarketingReveal className="relative mx-auto mt-10 max-w-[860px] sm:mt-12" delay={0.08}>
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-[linear-gradient(145deg,#0F172A_0%,#0C2340_100%)] shadow-[0_48px_100px_-40px_rgba(2,132,199,0.45)]">
            <div className="absolute inset-0 bg-[image:var(--marketing-grad)] opacity-[0.12]" aria-hidden />
            <div
              className="absolute inset-0 opacity-100"
              aria-hidden
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
            <div className="absolute top-5 left-6" aria-hidden>
              <span className="inline-flex items-center text-sm font-bold tracking-[0.08em] text-white/75 sm:text-base">
                <span>PA</span>
                <span className="mx-[0.08em] inline-flex items-center gap-[3px]">
                  <span className="h-[0.85em] w-[0.18em] rounded-full bg-white/90" />
                  <span className="h-[0.85em] w-[0.18em] rounded-full bg-white/70" />
                </span>
                <span>SIBL</span>
              </span>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <button
                type="button"
                disabled
                className="marketing-vid-pulse grid h-20 w-20 place-items-center rounded-full bg-white/95 text-[#0284C7]"
                aria-label="Video coming soon"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
                  <polygon points="6,3 20,12 6,21" fill="currentColor" />
                </svg>
              </button>
              <p className="text-[15px] font-semibold tracking-[0.2px] text-white/75">Video coming soon</p>
            </div>
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
