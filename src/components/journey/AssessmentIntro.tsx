import Link from "next/link";

import { AppPageShell } from "@/components/AppPageShell";
import {
  APP_BODY,
  APP_MUTED,
  BRAND_ACCENT_TEXT,
  CTA_PRIMARY_CLASS,
  CTA_SECONDARY_CLASS,
  FORM_CARD_CLASS,
  LABEL_CLASS,
  STEP_BADGE_CLASS,
} from "@/components/marketing/marketing-brand";
import { PERSONALITY_ASSESSMENT_TITLE } from "@/lib/results/report-branding";
import { ArrowRight } from "@/components/marketing/icons";

const STEPS = [
  {
    n: "01",
    title: PERSONALITY_ASSESSMENT_TITLE,
    detail: "90 questions across five traits — scroll at your own pace. Progress saves automatically.",
    time: "~15 min",
  },
  {
    n: "02",
    title: "Wellness context",
    detail: "Sleep, stress, goals, and barriers — a short section so recommendations fit your life.",
    time: "2–3 min",
  },
  {
    n: "03",
    title: "Your intelligence report",
    detail: "Behavioral pattern, blind spots, high-impact opportunities, and a four-pillar action plan.",
    time: "Instant",
  },
] as const;

export function AssessmentIntro() {
  return (
    <AppPageShell
      backHref="/"
      backLabel="Back to home"
      className="flex h-dvh flex-col overflow-hidden !min-h-0"
      contentClassName="flex min-h-0 flex-1 flex-col justify-center !overflow-hidden !py-3 sm:!py-4 lg:!py-5"
    >
      <div className="grid min-h-0 items-center gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 xl:gap-14">
        <div className="min-w-0">
          <p className={`${LABEL_CLASS} !text-[11px]`}>Assessment intro</p>
          <h1 className="mt-1.5 max-w-xl text-[1.5rem] font-bold leading-[1.12] tracking-tight text-[#0D1B2A] sm:mt-2 sm:text-3xl lg:text-[2.35rem]">
            Your wellness intelligence profile
          </h1>
          <p className={`mt-2 max-w-xl !text-[14px] !leading-relaxed sm:mt-3 sm:!text-base ${APP_BODY}`}>
            In about 15–20 minutes, complete a personality assessment and short wellness questionnaire. We turn your
            answers into a personalized report — pattern, blind spots, and a four-pillar action plan.
          </p>

          <div className="mt-4 hidden flex-wrap items-center gap-3 sm:mt-5 sm:flex">
            <Link href="/profile" className={`${CTA_PRIMARY_CLASS} !min-h-[46px] !px-6 !py-3 !text-[15px]`}>
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className={`${APP_MUTED} !text-xs`}>No payment required to begin · progress auto-saved</p>
          </div>
        </div>

        <div className={`${FORM_CARD_CLASS} !rounded-[18px] !p-3.5 sm:!p-5 lg:!p-6`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6E7191]">What to expect</p>
          <ul className="mt-2.5 space-y-2 sm:mt-3 sm:space-y-2.5">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="flex gap-3 rounded-xl border border-slate-100 bg-[#F7F9FB]/80 p-2.5 sm:gap-4 sm:p-3.5"
              >
                <span className={`${STEP_BADGE_CLASS} !h-8 !w-8 !rounded-lg !text-[10px] sm:!h-9 sm:!w-9 sm:!text-[11px]`}>
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                    <h2 className="text-[13px] font-bold text-[#0D1B2A] sm:text-sm">{step.title}</h2>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${BRAND_ACCENT_TEXT}`}>
                      {step.time}
                    </span>
                  </div>
                  <p className={`mt-0.5 ${APP_BODY} !text-[12px] !leading-snug sm:mt-1 sm:!text-[13px]`}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={`mt-2.5 hidden border-t border-slate-100 pt-2.5 sm:mt-3 sm:block sm:pt-3 ${APP_MUTED} !text-xs`}>
            Close the tab anytime — when you return, we pick up where you left off.
          </p>
        </div>
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-2 sm:hidden">
        <Link
          href="/profile"
          className={`flex w-full items-center justify-center ${CTA_PRIMARY_CLASS} !min-h-[44px] !py-2.5 !text-[15px]`}
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className={`flex w-full items-center justify-center ${CTA_SECONDARY_CLASS} !min-h-[40px] !py-2`}
        >
          Back to home
        </Link>
      </div>
    </AppPageShell>
  );
}
