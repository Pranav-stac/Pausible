import { HeroPreview } from "@/components/marketing/HeroPreview";
import { MarketingReveal } from "@/components/marketing/MarketingReveal";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { MARKETING_CONTAINER } from "@/components/marketing/marketing-brand";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="marketing-hero-wash relative scroll-mt-20 overflow-hidden pt-[104px]"
      id="top"
      aria-labelledby="hero-heading"
    >
      <div className="marketing-hero-orb marketing-hero-orb--a" aria-hidden />
      <div className="marketing-hero-orb marketing-hero-orb--b" aria-hidden />

      <div
        className={`${MARKETING_CONTAINER} relative flex flex-wrap items-center gap-14 px-6 py-[88px] pb-24 sm:px-6`}
      >
        <MarketingReveal className="min-w-[300px] flex-[1_1_400px]">
          <h1
            id="hero-heading"
            className="text-balance text-[clamp(38px,5.4vw,64px)] leading-[1.05] font-bold tracking-[-0.025em] text-[#111827]"
          >
            Wellness that fits{" "}
            <span className="pausibl-gradient-text">how you&apos;re wired.</span>
          </h1>

          <p className="mt-[22px] max-w-[520px] text-pretty text-[clamp(17px,1.5vw,20px)] leading-[1.6] text-[#4B5563]">
            Most plans fail because they ignore your personality. Pausibl reads how you actually operate —
            then builds wellness guidance you&apos;ll genuinely keep.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-[18px]">
            <TrackedAssessmentLink
              href={ctaHref}
              placement="hero_primary_cta"
              className="inline-flex items-center gap-2 rounded-[14px] border-[1.5px] border-[#0284C7]/20 bg-[image:var(--marketing-grad)] px-[30px] py-4 text-[17px] font-semibold text-white shadow-[0_14px_30px_-10px_rgba(99,102,241,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-10px_rgba(99,102,241,0.55)]"
            >
              Get Started
              <span aria-hidden>→</span>
            </TrackedAssessmentLink>
          </div>
        </MarketingReveal>

        <MarketingReveal className="flex min-w-[300px] flex-[1_1_380px] justify-center" delay={0.08}>
          <div className="w-full max-w-md">
            <HeroPreview />
          </div>
        </MarketingReveal>
      </div>
    </section>
  );
}
