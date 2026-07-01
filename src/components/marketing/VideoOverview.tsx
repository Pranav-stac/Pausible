import { LABEL_CLASS, MARKETING_CONTAINER, MARKETING_SECTION } from "@/components/marketing/marketing-brand";

export function VideoOverview() {
  return (
    <section className={`bg-white ${MARKETING_SECTION}`} id="overview" aria-labelledby="overview-heading">
      <div className={`${MARKETING_CONTAINER} grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14`}>
        <div>
          <p className={LABEL_CLASS}>Watch the overview</p>
          <h2 id="overview-heading" className="mt-3 text-balance text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl">
            Meet Pausibl in two minutes
          </h2>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-[#4D4D4D] sm:text-base">
            See how your personality shapes the way you approach wellness, and what your personalized report looks
            like.
          </p>
        </div>

        <div className="pausable-surface overflow-hidden rounded-2xl bg-[#0D1B2A]">
          <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6">
            <button
              type="button"
              disabled
              className="grid h-14 w-14 place-items-center rounded-full bg-white text-[#2D82FF] ring-1 ring-white/20"
              aria-label="Video coming soon"
            >
              <span className="ml-0.5 block h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-current" />
            </button>
            <p className="text-sm font-medium text-white/70">Video coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
}
