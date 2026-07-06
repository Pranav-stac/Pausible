"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketingReveal } from "@/components/marketing/MarketingReveal";

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

const AUTO_MS = 5000;

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [barKey, setBarKey] = useState(0);

  const goToStep = useCallback((n: number) => {
    setActiveStep(n);
    setBarKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
      setBarKey((k) => k + 1);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, []);

  const progressPct = activeStep * 20;

  return (
    <section className="scroll-mt-20" id="how" aria-labelledby="how-heading">
      <div className="mx-auto max-w-[960px] px-6 py-[104px]">
        <MarketingReveal className="mx-auto mb-[60px] max-w-[620px] text-center">
          <p className="mb-4 text-[13px] font-bold uppercase tracking-[1.5px] text-[var(--marketing-accent)]">
            How it works
          </p>
          <h2
            id="how-heading"
            className="text-balance text-[clamp(1.75rem,3.6vw,2.625rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]"
          >
            Five steps to a wellness plan that finally fits
          </h2>
        </MarketingReveal>

        <div>
          <div className="relative mb-12">
            <div
              className="absolute top-[26px] right-[10%] left-[10%] z-0 h-0.5 bg-[#E9EAEC]"
              aria-hidden
            />
            <div
              className="absolute top-[26px] left-[10%] z-[1] h-0.5 bg-[image:var(--marketing-grad)] transition-[width] duration-[550ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ width: `${progressPct}%` }}
              aria-hidden
            />
            <div className="relative z-[2] grid grid-cols-5">
              {STEPS.map((step, i) => {
                const isActive = i === activeStep;
                const isDone = i < activeStep;
                return (
                  <div key={step.short} className="flex flex-col items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => goToStep(i)}
                      className={`flex h-[52px] w-[52px] items-center justify-center rounded-full text-lg font-bold transition-[transform,box-shadow] duration-250 ${
                        isActive
                          ? "scale-[1.12] border-none bg-[image:var(--marketing-grad)] text-white shadow-[0_8px_20px_-8px_rgba(2,132,199,0.6)]"
                          : isDone
                            ? "border-none bg-[image:var(--marketing-grad)] text-white"
                            : "border-2 border-[#E5E7EB] bg-white text-[#9CA3AF]"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {i + 1}
                    </button>
                    <span
                      className={`max-w-[72px] text-center text-[11px] leading-[1.35] ${
                        i <= activeStep ? "font-bold text-[#374151]" : "font-medium text-[#9CA3AF]"
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
            {STEPS.map((step, i) => {
              const isActive = i === activeStep;
              return (
                <div
                  key={step.title}
                  className={`rounded-3xl border border-[#F1F2F4] bg-white px-11 py-11 shadow-[0_24px_60px_-30px_rgba(17,24,39,0.17)] transition-[opacity,transform] duration-400 ease-out ${
                    isActive
                      ? "relative z-[1] translate-y-0 opacity-100"
                      : "pointer-events-none absolute inset-x-0 top-0 z-0 translate-y-3 opacity-0"
                  }`}
                >
                  <p className="mb-3 text-xs font-bold tracking-[1.4px] text-[var(--marketing-accent)] uppercase">
                    Step {i + 1}
                  </p>
                  <h3 className="text-[26px] font-bold tracking-[-0.015em] text-[#111827]">{step.title}</h3>
                  <p className="mt-[13px] max-w-[620px] text-[17px] leading-[1.65] text-[#4B5563]">{step.body}</p>
                  {"badge" in step && step.badge ? (
                    <div className="mt-[18px] inline-flex items-center gap-2 rounded-full bg-[image:var(--marketing-grad-soft)] px-4 py-2 text-sm font-semibold text-[var(--marketing-accent)]">
                      <span className="text-base">✦</span> {step.badge}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-6 h-[3px] overflow-hidden rounded-sm bg-[#F1F2F4]">
            <div
              key={barKey}
              className="h-full w-0 bg-[image:var(--marketing-grad)]"
              style={{ animation: `marketing-auto-bar ${AUTO_MS}ms linear forwards` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
