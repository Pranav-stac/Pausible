import Image from "next/image";

import {
  LABEL_CLASS,
  MARKETING_BODY,
  MARKETING_CONTAINER,
  MARKETING_HEADING,
  MARKETING_SECTION,
} from "@/components/marketing/marketing-brand";
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
      className={`bg-white ${MARKETING_SECTION}`}
      id="personas"
      aria-labelledby="personas-heading"
    >
      <div className={MARKETING_CONTAINER}>
        <header className="max-w-2xl">
          <p className={LABEL_CLASS}>Meet your archetype</p>
          <h2 id="personas-heading" className={`mt-3 text-balance text-3xl sm:text-4xl ${MARKETING_HEADING}`}>
            Six ways of being. One of them is you.
          </h2>
          <p className={`mt-4 max-w-[48ch] ${MARKETING_BODY}`}>
            Your wellness persona is one of six archetypes, each shaped by how you think, feel, and respond to
            challenge. No single type is better. Each has strengths and blind spots.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {PERSONA_KEYS.map((key, index) => {
            const animal = PERSONA_ANIMAL[key];
            const display = PERSONA_DISPLAY[key];
            const featured = index === 0;
            return (
              <article
                key={key}
                className={`pausable-surface group flex flex-col rounded-2xl p-6 transition hover:border-slate-300/90 ${
                  featured ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F7F9FB] sm:h-20 sm:w-20">
                    <Image
                      src={animal.imagePath}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight text-[#0D1B2A]">{display.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#4D4D4D]">{MARKETING_TAGLINES[key]}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12">
          <TrackedAssessmentLink
            href={ctaHref}
            placement="personas_section_cta"
            className="text-base font-semibold text-[#2D82FF] transition hover:text-[#2574ee]"
          >
            Which one are you? Find out
          </TrackedAssessmentLink>
        </div>
      </div>
    </section>
  );
}
