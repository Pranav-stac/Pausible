import Image from "next/image";

import { LABEL_CLASS } from "@/components/marketing/marketing-brand";
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

export function PersonasSection({ ctaHref }: { ctaHref: string }) {
  return (
    <section
      className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      id="personas"
      aria-labelledby="personas-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(45,130,255,0.08) 0%, rgba(0,201,200,0.04) 40%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <header className="text-center">
          <p className={LABEL_CLASS}>Meet your archetype</p>
          <h2
            id="personas-heading"
            className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight text-[#0D1B2A] sm:text-4xl"
          >
            Six ways of being. One of them is you.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-[#4D4D4D] sm:text-base">
            Your wellness persona is one of six archetypes — each shaped by how you think, feel, and respond to
            challenge. No single type is better. Each has strengths and blind spots.
          </p>
          <p className="mx-auto mt-4 flex items-center justify-center gap-2 text-sm text-[#6E7191]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Click on any card below to explore the archetype in depth
          </p>
        </header>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {PERSONA_KEYS.map((key) => {
            const animal = PERSONA_ANIMAL[key];
            const display = PERSONA_DISPLAY[key];
            return (
              <article
                key={key}
                className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(13,27,42,0.12)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(13,27,42,0.15)]"
              >
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-[#F7F9FB]">
                  <Image
                    src={animal.imagePath}
                    alt=""
                    width={96}
                    height={96}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <h3 className="text-center text-lg font-bold text-[#0D1B2A]">{display.label}</h3>
                <p className="mt-2 flex-1 text-center text-sm leading-relaxed text-[#4D4D4D]">
                  {MARKETING_TAGLINES[key]}
                </p>
                <p className="mt-4 text-center text-sm font-medium text-[#2D82FF] transition group-hover:text-[#00C9C8]">
                  Click to explore →
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 text-center sm:mt-12">
          <TrackedAssessmentLink
            href={ctaHref}
            placement="personas_section_cta"
            className="text-base font-semibold text-[#2D82FF] transition hover:text-[#00C9C8]"
          >
            Which one are you? Find out →
          </TrackedAssessmentLink>
        </div>
      </div>
    </section>
  );
}
