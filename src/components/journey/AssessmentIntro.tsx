import Link from "next/link";

import { AppPageShell } from "@/components/AppPageShell";
import {
  APP_BODY,
  APP_HEADING_LG,
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
    <AppPageShell backHref="/" backLabel="Back to home" contentClassName="!py-10 sm:!py-14 lg:!py-16">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-20">
        <div className="lg:pt-4">
          <p className={LABEL_CLASS}>Assessment intro</p>
          <h1 className={`mt-4 max-w-xl ${APP_HEADING_LG}`}>Your wellness intelligence profile</h1>
          <p className={`mt-5 max-w-xl sm:text-lg ${APP_BODY}`}>
            In about 15–20 minutes, you&apos;ll complete a structured personality assessment and a short wellness
            questionnaire. We translate your answers into a personalized report — behavioral pattern, blind spots,
            and a four-pillar action plan built for how you actually operate.
          </p>

          <div className="mt-8 hidden flex-wrap items-center gap-4 sm:flex">
            <Link href="/profile" className={CTA_PRIMARY_CLASS}>
              Get started
              <ArrowRight className="h-[18px] w-[18px]" />
            </Link>
            <p className={APP_MUTED}>No payment required to begin · progress auto-saved</p>
          </div>
        </div>

        <div className={`${FORM_CARD_CLASS} p-6 sm:p-8 lg:p-9`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6E7191]">What to expect</p>
          <ul className="mt-6 space-y-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-[#F7F9FB]/80 p-4 sm:gap-5 sm:p-5"
              >
                <span className={STEP_BADGE_CLASS}>{step.n}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-bold text-[#0D1B2A] sm:text-base">{step.title}</h2>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${BRAND_ACCENT_TEXT}`}>
                      {step.time}
                    </span>
                  </div>
                  <p className={`mt-1.5 ${APP_BODY} !text-sm`}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className={`mt-6 border-t border-slate-100 pt-5 ${APP_MUTED}`}>
            Close the tab anytime — when you return, we pick up where you left off.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:hidden">
        <Link href="/profile" className={`flex w-full items-center justify-center ${CTA_PRIMARY_CLASS}`}>
          Get started
          <ArrowRight className="h-[18px] w-[18px]" />
        </Link>
        <Link href="/" className={`flex w-full items-center justify-center ${CTA_SECONDARY_CLASS}`}>
          Back to home
        </Link>
      </div>
    </AppPageShell>
  );
}
