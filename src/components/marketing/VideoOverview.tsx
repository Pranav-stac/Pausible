import { LABEL_CLASS } from "@/components/marketing/marketing-brand";

export function VideoOverview() {
  return (
    <section className="bg-[#F7F9FB] px-4 py-16 sm:px-6 sm:py-20 lg:py-24" id="journey">
      <div className="mx-auto max-w-6xl text-center">
        <p className={LABEL_CLASS}>Watch the overview</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl">
          Meet Pausibl in 2 minutes
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-[#4D4D4D] sm:text-base">
          See how your personality shapes the way you approach wellness — and what your personalized report looks like.
        </p>

        <div className="relative mx-auto mt-10 max-w-4xl sm:mt-12">
          <div
            className="absolute -inset-x-4 bottom-0 top-8 rounded-3xl bg-linear-to-b from-[#2D82FF]/20 to-transparent blur-2xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-2xl bg-[#0D1B2A] shadow-[0_24px_60px_-12px_rgba(13,27,42,0.45)] sm:rounded-3xl">
            <div className="flex aspect-video flex-col items-center justify-center gap-4 px-6 py-16 sm:py-20">
              <button
                type="button"
                disabled
                className="group grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-lg transition sm:h-[4.5rem] sm:w-[4.5rem]"
                aria-label="Video coming soon"
              >
                <span className="ml-1 grid h-0 w-0 place-items-center border-y-[10px] border-l-[16px] border-y-transparent border-l-[#2D82FF] sm:border-y-[11px] sm:border-l-[18px]" />
              </button>
              <p className="text-sm font-medium text-white/70">Video coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
