"use client";

import { useCallback, useEffect, useState } from "react";

import { LABEL_CLASS, MARKETING_CONTAINER } from "@/components/marketing/marketing-brand";

const STEPS = [
  {
    short: "Tell Us About You",
    title: "Tell Us About You",
    body: (
      <>
        Answer a series of engaging questions about your habits, lifestyle, preferences, and everyday wellness
        choices. It takes around <strong>15–20 minutes</strong> and there are no right or wrong answers.
      </>
    ),
  },
  {
    short: "Decode Your Personality",
    title: "We Decode Your Wellness Personality",
    body: "Our proprietary Wellness Intelligence Engine analyzes your responses to understand how you naturally approach nutrition, exercise, sleep, recovery, and mental well-being.",
  },
  {
    short: "Discover What Makes You Tick",
    title: "Discover What Makes You Tick",
    body: "Uncover your unique wellness personality, natural strengths, hidden blind spots, motivation style, and the factors that help — or hinder — your long-term consistency.",
  },
  {
    short: "Your Wellness Blueprint",
    title: "Receive Your Personalized Wellness Blueprint",
    body: "Get tailored insights, practical recommendations, and a wellness strategy built around your personality, goals, lifestyle, and daily realities — not generic advice.",
    badge: "Includes your personalized Coach Guide",
  },
  {
    short: "Build a Lasting System",
    title: "Build a Wellness System That Lasts",
    body: "Walk away with a clear, actionable roadmap designed to fit your life, helping you create healthy habits you can actually sustain for the long term.",
  },
] as const;

const AUTO_MS = 5200;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const goTo = useCallback((idx: number) => {
    setActive(idx);
    setProgress(0);
  }, []);

  useEffect(() => {
    const tick = 50;
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = p + (tick / AUTO_MS) * 100;
        if (next >= 100) {
          setActive((a) => (a + 1) % STEPS.length);
          return 0;
        }
        return next;
      });
    }, tick);
    return () => window.clearInterval(id);
  }, [active]);

  const progressWidth = `${(active / (STEPS.length - 1)) * 80}%`;

  return (
    <section id="how" className="scroll-mt-20 bg-white" aria-labelledby="how-heading">
      <div className={`${MARKETING_CONTAINER} px-6 py-[104px] sm:px-6`}>
        <div className="mx-auto mb-[60px] max-w-[620px] text-center">
          <p className={LABEL_CLASS}>How it works</p>
          <h2
            id="how-heading"
            className="mt-4 text-balance text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]"
          >
            Five steps to a wellness plan that finally fits
          </h2>
        </div>

        <div className="mx-auto max-w-[960px]">
          <div className="relative mb-12">
            <div
              className="absolute top-[26px] right-[10%] left-[10%] z-0 h-0.5 bg-[#E9EAEC]"
              aria-hidden
            />
            <div
              className="absolute top-[26px] left-[10%] z-[1] h-0.5 bg-[image:var(--marketing-grad)] transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ width: progressWidth }}
              aria-hidden
            />
            <div className="relative z-[2] grid grid-cols-5 gap-2">
              {STEPS.map((step, idx) => {
                const isActive = idx === active;
                return (
                  <div key={step.short} className="flex flex-col items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => goTo(idx)}
                      className={`grid h-[52px] w-[52px] place-items-center rounded-full text-lg font-bold transition-[transform,box-shadow,background,color,border] duration-250 ${
                        isActive
                          ? "scale-110 border-0 bg-[image:var(--marketing-grad)] text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.6)]"
                          : "border-2 border-[#E5E7EB] bg-white text-[#9CA3AF]"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {idx + 1}
                    </button>
                    <span
                      className={`max-w-[72px] text-center text-[11px] leading-[1.35] ${
                        isActive ? "font-bold text-[#374151]" : "font-medium text-[#9CA3AF]"
                      }`}
                    >
                      {step.short}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative h-[300px] overflow-hidden">
            {STEPS.map((step, idx) => {
              const isActive = idx === active;
              return (
                <div
                  key={step.short}
                  className={`rounded-3xl border border-[#F1F2F4] bg-white p-11 shadow-[0_24px_60px_-30px_rgba(17,24,39,0.17)] transition-[opacity,transform] duration-400 ease-out ${
                    isActive
                      ? "relative z-[1] translate-y-0 opacity-100"
                      : "pointer-events-none absolute inset-0 z-0 translate-y-3 opacity-0"
                  }`}
                >
                  <p className="text-xs font-bold tracking-[0.14em] text-[#0284C7] uppercase">Step {idx + 1}</p>
                  <h3 className="mt-3 text-[26px] font-bold tracking-[-0.015em] text-[#111827]">{step.title}</h3>
                  <p className="mt-3 max-w-[620px] text-[17px] leading-[1.65] text-[#4B5563]">{step.body}</p>
                  {"badge" in step && step.badge ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[image:var(--marketing-grad-soft)] px-4 py-2 text-sm font-semibold text-[#0284C7]">
                      <span aria-hidden>✦</span>
                      {step.badge}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 h-[3px] overflow-hidden rounded-sm bg-[#F1F2F4]">
            <div
              className="h-full bg-[image:var(--marketing-grad)] transition-[width] duration-100 linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
