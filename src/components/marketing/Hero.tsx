import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { GRADIENT_BG, GRADIENT_BG_HOVER } from "@/components/marketing/marketing-brand";

export function Hero({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="bg-white px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-20"
      id="top"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="text-center lg:text-left">
          <h1
            id="hero-heading"
            className="mx-auto max-w-3xl text-balance text-[2rem] font-bold leading-[1.15] tracking-tight text-[#0D1B2A] sm:text-5xl sm:leading-[1.1] lg:mx-0 lg:max-w-4xl lg:text-[3.25rem]"
          >
            Wellness that fits{" "}
            <span className="pausibl-gradient-text">how you&apos;re wired.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-[#4D4D4D] sm:mt-6 sm:text-lg lg:mx-0 lg:max-w-2xl">
            A science-backed wellness persona built on your personality — not generic advice.
            Discover how you move, recover, and stay consistent in a way that actually fits you.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 lg:items-start">
            <TrackedAssessmentLink
              href={ctaHref}
              placement="hero_primary_cta"
              className={`group inline-flex min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-xl ${GRADIENT_BG} ${GRADIENT_BG_HOVER} px-8 py-3.5 text-base font-semibold text-white shadow-[0_12px_32px_-8px_rgba(0,201,200,0.45),0_8px_24px_-6px_rgba(45,130,255,0.35)] transition hover:shadow-[0_16px_40px_-8px_rgba(0,201,200,0.5),0_10px_28px_-6px_rgba(45,130,255,0.4)] sm:w-auto sm:max-w-none`}
            >
              Get Started
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="transition group-hover:translate-x-0.5"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </TrackedAssessmentLink>
          </div>
        </div>
      </div>
    </section>
  );
}
