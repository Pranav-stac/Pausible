import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";

/** Primary marketing CTA — blue gradient strip (Product demo style). */
export function GradientAssessmentCta({
  href,
  placement,
  className = "",
}: {
  href: string;
  placement: string;
  className?: string;
}) {
  return (
    <TrackedAssessmentLink
      href={href}
      placement={placement}
      className={`group flex w-full max-w-2xl items-center gap-4 rounded-3xl bg-linear-to-r from-[#0b47ff] via-[#4a7dff] to-[#20b7ff] px-5 py-4 text-left text-white shadow-[0_28px_70px_-24px_rgba(11,71,255,.45)] transition hover:-translate-y-[2px] hover:shadow-[0_32px_76px_-22px_rgba(11,71,255,.52)] sm:gap-5 sm:px-8 sm:py-5 ${className}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/20 ring-2 ring-white/35 sm:h-14 sm:w-14">
        <span className="ml-0.5 text-2xl transition group-hover:scale-105 sm:ml-1 sm:text-3xl" aria-hidden>
          ▶
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-base font-semibold sm:text-lg">Start the guided assessment</div>
        <p className="mt-1 text-[11px] leading-snug text-white/85 sm:text-sm">
          Structured checkpoints · Instant scoring draft · Pay to unlock full deck
        </p>
      </div>
    </TrackedAssessmentLink>
  );
}
