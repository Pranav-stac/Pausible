"use client";

import Image from "next/image";
import { useState } from "react";

import {
  MarketingReveal,
  MarketingStagger,
  MarketingStaggerItem,
} from "@/components/marketing/MarketingReveal";
import { LABEL_CLASS, MARKETING_BODY, MARKETING_CONTAINER } from "@/components/marketing/marketing-brand";
import { TrackedAssessmentLink } from "@/components/marketing/TrackedAssessmentLink";
import { PERSONA_ANIMAL, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";

const MARKETING_TAGLINES: Record<PersonaKey, string> = {
  self_regulated_planner: "Disciplined and structured. You build wellness that lasts.",
  social_motivator: "Social and energetic. You thrive when others are in it with you.",
  stress_sensitive: "Sensitive and careful. You move best when you feel safe.",
  curious_explorer: "Curious and creative. You need variety to stay engaged.",
  resilient_performer: "Grounded and balanced. You find a calm, steady rhythm.",
  brittle_avoidant: "Protective and gradual. You start small and stay consistent.",
};

const BACK_COPY: Record<PersonaKey, { strength: string; edge: string }> = {
  self_regulated_planner: {
    strength: "Structure and follow-through",
    edge: "Flexibility when plans break",
  },
  social_motivator: {
    strength: "Energy and accountability",
    edge: "Solo consistency on quiet weeks",
  },
  stress_sensitive: {
    strength: "Self-awareness and care",
    edge: "Pushing pace when stressed",
  },
  curious_explorer: {
    strength: "Creativity and openness",
    edge: "Staying with one routine long enough",
  },
  resilient_performer: {
    strength: "Steady recovery and balance",
    edge: "Noticing early warning signs",
  },
  brittle_avoidant: {
    strength: "Protective pacing",
    edge: "Trusting small wins to compound",
  },
};

function PersonaFlipCard({ personaKey }: { personaKey: PersonaKey }) {
  const [flipped, setFlipped] = useState(false);
  const animal = PERSONA_ANIMAL[personaKey];
  const display = PERSONA_DISPLAY[personaKey];
  const back = BACK_COPY[personaKey];

  return (
    <article
      className="marketing-persona-flip rounded-[22px] shadow-[0_18px_44px_-30px_rgba(17,24,39,0.2)]"
      onClick={() => setFlipped((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setFlipped((v) => !v);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
    >
      <div className={`marketing-persona-flip-inner ${flipped ? "is-flipped" : ""}`}>
        <div className="marketing-persona-face flex flex-col border border-[#F1F2F4] bg-white p-7 pb-5">
          <div className="mb-[18px] h-[100px] w-[100px] overflow-hidden">
            <Image
              src={animal.imagePath}
              alt=""
              width={100}
              height={100}
              className="h-full w-full object-contain"
            />
          </div>
          <h3 className="text-xl font-bold tracking-[-0.01em] text-[#111827]">{display.label}</h3>
          <p className="mt-2 text-[15px] leading-[1.55] text-[#4B5563]">{MARKETING_TAGLINES[personaKey]}</p>
          <p className="mt-auto pt-3.5 text-xs font-medium text-[#C4C9D4]">Click to explore →</p>
        </div>

        <div className="marketing-persona-face marketing-persona-face--back text-white">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-white/80 uppercase">Archetype insight</p>
            <h3 className="mt-2 text-xl font-bold">{display.label}</h3>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-white/90">
            <p>
              <span className="font-semibold text-white">Core strength:</span> {back.strength}
            </p>
            <p>
              <span className="font-semibold text-white">Growth edge:</span> {back.edge}
            </p>
          </div>
          <p className="text-xs font-medium text-white/75">Tap to flip back</p>
        </div>
      </div>
    </article>
  );
}

export function PersonasSection({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="relative scroll-mt-20 overflow-hidden border-y border-[#F3F4F6] bg-[#F9FAFB]"
      id="personas"
      aria-labelledby="personas-heading"
    >
      <div
        className="pointer-events-none absolute top-[60px] left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[image:var(--marketing-grad)] opacity-[0.09] blur-[110px]"
        aria-hidden
      />

      <div className={`${MARKETING_CONTAINER} relative px-6 py-[104px] sm:px-6`}>
        <MarketingReveal className="mx-auto mb-[60px] max-w-[640px] text-center">
          <p className={LABEL_CLASS}>Meet your archetype</p>
          <h2
            id="personas-heading"
            className="mt-4 text-balance text-[clamp(28px,3.6vw,42px)] font-bold leading-[1.12] tracking-[-0.02em] text-[#111827]"
          >
            Six ways of being. One of them is you.
          </h2>
          <p className={`mx-auto mt-[18px] ${MARKETING_BODY}`}>
            Each persona reflects a real pattern in how people approach change — grounded in behavioral science,
            not horoscopes.
          </p>
          <p className="mx-auto mt-[18px] inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3.5 py-1.5 text-[13px] font-semibold text-[#9CA3AF]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <circle cx="7" cy="7" r="6" stroke="#9CA3AF" strokeWidth="1.3" />
              <path d="M5 5.5C5 4.4 5.9 3.5 7 3.5s2 .9 2 2c0 1.5-2 2-2 3.5" stroke="#9CA3AF" strokeWidth="1.3" strokeLinecap="round" />
              <circle cx="7" cy="10.5" r="0.7" fill="#9CA3AF" />
            </svg>
            Click on any card below to explore the archetype in depth
          </p>
        </MarketingReveal>

        <MarketingStagger className="grid gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(264px,1fr))]">
          {PERSONA_KEYS.map((key) => (
            <MarketingStaggerItem key={key}>
              <PersonaFlipCard personaKey={key} />
            </MarketingStaggerItem>
          ))}
        </MarketingStagger>

        <MarketingReveal className="mt-12 text-center" delay={0.08}>
          <TrackedAssessmentLink
            href={ctaHref}
            placement="personas_section_cta"
            className="text-base font-semibold text-[#0284C7] transition hover:text-[#00BFA5]"
          >
            Which one are you? Find out →
          </TrackedAssessmentLink>
        </MarketingReveal>
      </div>
    </section>
  );
}
