"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { OceanRadarChart } from "@/components/results/OceanRadarChart";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { PERSONA_ANIMAL, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS } from "@/lib/scoring/persona-types";
import { fitTierLabel, blendStrengthLabel } from "@/lib/scoring/persona-fit";
import type { FitTier, BlendStrength, PersonaAnalysis } from "@/lib/scoring/persona-types";
import { DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import type { OpportunityCard, PillarName } from "@/lib/recommendations/types";
import type { WellnessReportSections } from "@/lib/recommendations/types";
import type { DualSectionPart } from "@/lib/results/report-section-split";

export const REPORT_PAGE =
  "report-page mx-auto box-border w-full max-w-[49.625rem] overflow-hidden bg-white shadow-[0_4px_24px_-8px_rgba(15,23,42,0.1)] print:shadow-none";
export const REPORT_PAGE_BODY = "relative flex min-h-[70.1875rem] flex-col px-10 py-10 sm:px-12 sm:py-11";

const PILLAR_SHORT: Record<PillarName, string> = {
  Nutrition: "Nutrition",
  "Physical Activity": "Physical Activity",
  "Sleep & Recovery": "Sleep & Recovery",
  "Mental Wellness": "Mental Wellness",
};

export function ReportFooter({
  page,
  total,
  refId,
}: {
  page: number;
  total: number;
  refId: string;
}) {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-400">
      <span>Pausible · Wellness Intelligence Report · v2.0</span>
      <span className="tabular-nums">
        {refId} · {page}/{total}
      </span>
    </footer>
  );
}

export function SlideLabel({ index, label }: { index: string; label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
      Slide {index} — {label}
    </p>
  );
}

export function SlideTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-7 border-b border-slate-200 pb-5">
      <h2 className="text-[1.6rem] font-bold leading-tight tracking-tight text-slate-950 sm:text-[1.75rem]">
        {title}
      </h2>
      {subtitle ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
    </header>
  );
}

export function ContentBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 ${className}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-700">{title}</h3>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function ProseBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  if (!paragraphs.length) return <p className="text-sm italic text-slate-400">—</p>;
  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[14px] leading-[1.72] text-slate-700">
          {p}
        </p>
      ))}
    </div>
  );
}

export function DualColumnSection({ left, right }: { left: DualSectionPart; right: DualSectionPart }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ContentBlock title={left.title}>
        <ProseBlock text={left.body} />
      </ContentBlock>
      <ContentBlock title={right.title}>
        <ProseBlock text={right.body} />
      </ContentBlock>
    </div>
  );
}

function PersonaCircle({
  imagePath,
  emoji,
  label,
  size = "lg",
}: {
  imagePath?: string | null;
  emoji?: string | null;
  label?: string;
  size?: "lg" | "sm";
}) {
  const dim = size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-16 w-16 sm:h-20 sm:w-20";
  return (
    <figure className="flex flex-col items-center gap-2">
      <div
        className={`relative flex ${dim} items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-50`}
      >
        {imagePath ? (
          <Image src={imagePath} alt="" width={128} height={128} className="h-full w-full object-cover" />
        ) : (
          <span className={size === "lg" ? "text-4xl" : "text-2xl"}>{emoji ?? "✦"}</span>
        )}
      </div>
      {label ? <figcaption className="max-w-[7rem] text-center text-[11px] font-semibold text-slate-600">{label}</figcaption> : null}
    </figure>
  );
}

export function CoverSlide({
  model,
  refId,
  totalPages,
}: {
  model: ResultsReportModel;
  refId: string;
  totalPages: number;
}) {
  const oneLiner = model.primaryKey ? PERSONA_DISPLAY[model.primaryKey].summary : model.primarySummary;

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="01" label="Cover" />

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm font-bold tracking-tight text-slate-900">Pausible</p>
            <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">
              {model.animalName ?? model.primaryLabel}
            </h1>

            <ContentBlock title="Persona title">
              <p className="text-base font-semibold leading-snug text-slate-900">
                {model.personaTitle ?? model.primaryLabel}
              </p>
              {model.fitTier ? (
                <p className="mt-2 text-xs text-slate-500">
                  Fit tier: {fitTierLabel(model.fitTier as FitTier)}
                  {model.blendStrength ? ` · ${blendStrengthLabel(model.blendStrength as BlendStrength)}` : ""}
                </p>
              ) : null}
            </ContentBlock>

            <ContentBlock title="One-line persona description">
              <p className="text-sm leading-relaxed text-slate-700">{oneLiner}</p>
            </ContentBlock>
          </div>

          <ContentBlock title="Persona illustration" className="flex min-h-[280px] items-center justify-center">
            <PersonaCircle imagePath={model.animalImagePath} emoji={model.animalEmoji} size="lg" />
          </ContentBlock>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span>
            {model.participantName} · {model.generatedAt} · Report {refId}
          </span>
        </div>

        <ReportFooter page={1} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function IntroductionSlide({ page, totalPages, refId }: { page: number; totalPages: number; refId: string }) {
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="02" label="Introduction" />
        <SlideTitle title="Introduction" />

        <ContentBlock title="About the report" className="mb-5">
          <p className="text-sm leading-relaxed text-slate-700">
            Your Wellness Intelligence Report maps your behavioral patterns to six persona archetypes, then translates
            those patterns into personalized nutrition, movement, sleep, and mental wellness guidance — built from your
            assessment, goals, and barriers.
          </p>
        </ContentBlock>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ContentBlock title="Key objectives of the report">
            <ul className="space-y-2.5 text-sm text-slate-700">
              <li className="flex gap-2">
                <span className="text-slate-400">1.</span>
                Reveal how you naturally approach wellness — strengths and blind spots.
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400">2.</span>
                Show where you stand relative to your primary persona pattern.
              </li>
              <li className="flex gap-2">
                <span className="text-slate-400">3.</span>
                Deliver a prioritized, persona-matched action plan you can start this week.
              </li>
            </ul>
          </ContentBlock>

          <ContentBlock title="Persona archetypes">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PERSONA_KEYS.map((key) => {
                const animal = PERSONA_ANIMAL[key];
                const display = PERSONA_DISPLAY[key];
                return (
                  <div key={key} className="rounded-md border border-slate-100 bg-slate-50/80 p-2.5 text-center">
                    <span className="text-xl">{animal.emoji}</span>
                    <p className="mt-1 text-[11px] font-bold text-slate-800">{animal.name}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{display.archetype}</p>
                  </div>
                );
              })}
            </div>
          </ContentBlock>
        </div>

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function WellnessPersonalitySlide({
  model,
  narrative,
  secondaryInfluence,
  quickProfile,
  page,
  totalPages,
  refId,
}: {
  model: ResultsReportModel;
  narrative: string;
  secondaryInfluence?: string | null;
  quickProfile?: WellnessReportSections["quickProfile"];
  page: number;
  totalPages: number;
  refId: string;
}) {
  const secondaryAnimal = model.secondaryKey ? PERSONA_ANIMAL[model.secondaryKey] : null;

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="03" label="Your Wellness Personality" />
        <SlideTitle title="Your Wellness Personality" />

        <div className="grid gap-5 lg:grid-cols-[auto_1fr_11.5rem]">
          <div className="flex flex-row items-start gap-4 lg:flex-col lg:items-center">
            <PersonaCircle imagePath={model.animalImagePath} emoji={model.animalEmoji} label="Primary" size="lg" />
            {secondaryAnimal ? (
              <PersonaCircle
                imagePath={secondaryAnimal.imagePath}
                emoji={secondaryAnimal.emoji}
                label={model.secondaryLabel ?? "Secondary"}
                size="sm"
              />
            ) : null}
          </div>

          <div className="space-y-4">
            <ContentBlock title="Persona narrative">
              <ProseBlock text={narrative} />
            </ContentBlock>
            {secondaryInfluence?.trim() && model.blendStrength !== "pure" ? (
              <ContentBlock title="Secondary persona influence">
                <ProseBlock text={secondaryInfluence} />
              </ContentBlock>
            ) : null}
          </div>

          {quickProfile ? (
            <aside className="rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="border-b border-slate-200 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">Quick profile</p>
              </div>
              <dl className="divide-y divide-slate-100 text-xs">
                {[
                  { k: "Primary persona", v: model.animalName ?? model.primaryLabel },
                  {
                    k: "Persona percentage",
                    v: `${quickProfile.personaPercentage}% ${model.animalName ?? model.primaryLabel}`,
                  },
                  {
                    k: "Persona fit score",
                    v:
                      model.fitScore != null
                        ? `${Math.round(model.fitScore)}/100 — ${model.fitTier ? fitTierLabel(model.fitTier as FitTier) : ""} tier`
                        : "—",
                  },
                  { k: "Wellness style", v: quickProfile.wellnessStyle },
                  { k: "Energy pattern", v: quickProfile.energyPattern },
                  { k: "Motivation driver", v: quickProfile.motivationDriver },
                  { k: "Risk factor", v: quickProfile.riskFactor },
                  { k: "Best environment", v: quickProfile.bestEnvironment },
                ].map((row) => (
                  <div key={row.k} className="px-3 py-2.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{row.k}</dt>
                    <dd className="mt-0.5 font-semibold leading-snug text-slate-800">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          ) : null}
        </div>

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

function PersonaDistribution({ mix }: { mix: ResultsReportModel["personaMix"] }) {
  return (
    <div className="space-y-2.5">
      {mix.slice(0, 6).map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-slate-700">{row.label}</span>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-600"
              style={{ width: `${row.pct}%`, opacity: 0.35 + (row.pct / 100) * 0.65 }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-slate-800">
            {row.pct.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function WhereYouStandSlide({
  model,
  personaAnalysis,
  traitDeviationNarratives,
  secondaryContext,
  page,
  totalPages,
  refId,
}: {
  model: ResultsReportModel;
  personaAnalysis: PersonaAnalysis | null;
  traitDeviationNarratives: string[];
  secondaryContext?: string | null;
  page: number;
  totalPages: number;
  refId: string;
}) {
  const primaryKey = model.primaryKey;

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="06" label="Where You Stand" />
        <SlideTitle title="Where You Stand" subtitle="Relative positioning against your primary persona pattern" />

        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your persona fit</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{model.personaTitle ?? model.primaryLabel}</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <ContentBlock title="Persona title">
              <p className="font-semibold text-slate-900">{model.personaTitle ?? model.primaryLabel}</p>
              {model.fitScore != null ? (
                <p className="mt-1 text-sm text-slate-600">{Math.round(model.fitScore)}% fit score</p>
              ) : null}
            </ContentBlock>

            {traitDeviationNarratives[0] ? (
              <ContentBlock title="Trait deviation insight #1">
                <ProseBlock text={traitDeviationNarratives[0]} />
              </ContentBlock>
            ) : null}

            {traitDeviationNarratives[1] ? (
              <ContentBlock title="Trait deviation insight #2">
                <ProseBlock text={traitDeviationNarratives[1]} />
              </ContentBlock>
            ) : null}
          </div>

          <div className="space-y-4">
            {personaAnalysis && primaryKey ? (
              <ContentBlock title="Radar chart — you vs persona centroid">
                <div className="flex justify-center py-2">
                  <OceanRadarChart
                    userScores={personaAnalysis.traitAverages}
                    centroidScores={DEFAULT_PERSONA_CENTROIDS[primaryKey]}
                    size={220}
                    accent="#475569"
                  />
                </div>
              </ContentBlock>
            ) : null}

            <ContentBlock title="Persona distribution">
              <PersonaDistribution mix={model.personaMix} />
            </ContentBlock>
          </div>
        </div>

        {secondaryContext?.trim() ? (
          <ContentBlock title="Secondary persona context" className="mt-4">
            <ProseBlock text={secondaryContext} />
          </ContentBlock>
        ) : null}

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function OpportunityCardsGrid({ cards }: { cards: OpportunityCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.slice(0, 3).map((card, i) => (
        <article key={card.id + i} className="flex flex-col overflow-hidden rounded-lg border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
              {PILLAR_SHORT[card.pillar]}
            </span>
            <span className="text-[9px] font-bold uppercase text-slate-500">Impact: {card.impactLevel}</span>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Opportunity {i + 1}</p>
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-950">{card.headline}</h3>
            <div className="mt-3 flex-1 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Why it matters</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{card.whyItMatters}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PillarColumn({
  pillar,
  focusArea,
  focusReason,
  dos,
  donts,
}: {
  pillar: PillarName;
  focusArea: string;
  focusReason: string;
  dos: string[];
  donts: string[];
}) {
  const short =
    pillar === "Physical Activity"
      ? "Physical activity"
      : pillar === "Sleep & Recovery"
        ? "Sleep & recovery"
        : pillar;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{short}</p>
      </div>

      <div className="border-b border-slate-100 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Focus area</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{focusArea}</p>
        {focusReason ? <p className="mt-1 text-xs text-slate-600">{focusReason}</p> : null}
      </div>

      <div className="border-b border-slate-100 p-4">
        <p className="text-[10px] font-bold uppercase text-slate-600">4 Do&apos;s</p>
        <ol className="mt-2 space-y-2">
          {dos.map((text, i) => (
            <li key={text} className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-slate-500">{i + 1}. </span>
              {text}
            </li>
          ))}
        </ol>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-bold uppercase text-slate-600">2 Don&apos;ts</p>
        <ol className="mt-2 space-y-2">
          {donts.map((text, i) => (
            <li key={text} className="text-xs leading-relaxed text-slate-700">
              <span className="font-bold text-slate-500">{i + 1}. </span>
              {text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function DualPillarSlide({
  pillars,
  plans,
  page,
  totalPages,
  refId,
  slideIndex,
  slideLabel,
  title,
}: {
  pillars: PillarName[];
  plans: Partial<Record<PillarName, { focusArea: string; focusReason: string; dos: string[]; donts: string[] }>>;
  page: number;
  totalPages: number;
  refId: string;
  slideIndex: string;
  slideLabel: string;
  title: string;
}) {
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index={slideIndex} label={slideLabel} />
        <SlideTitle title={title} subtitle="Your personalized action plan" />

        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => {
            const plan = plans[pillar];
            if (!plan) return null;
            return (
              <PillarColumn
                key={pillar}
                pillar={pillar}
                focusArea={plan.focusArea}
                focusReason={plan.focusReason}
                dos={plan.dos}
                donts={plan.donts}
              />
            );
          })}
        </div>

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function LaunchpadSlide({
  launchpad,
  page,
  totalPages,
  refId,
}: {
  launchpad: Record<
    "start_here" | "environment_setup" | "recovery_rules",
    { action: string; context: string; id: string }[]
  >;
  page: number;
  totalPages: number;
  refId: string;
}) {
  const cols = [
    { key: "start_here" as const, title: "Start here", desc: "2 first actions — easiest wins, doable today" },
    {
      key: "environment_setup" as const,
      title: "Environment setup",
      desc: "One-time changes to your physical or digital space",
    },
    { key: "recovery_rules" as const, title: "Recovery rules", desc: "Simple if-then rules for rest and prevention" },
  ];

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="10" label="Your Wellness Launchpad" />
        <SlideTitle
          title="Your Wellness Launchpad"
          subtitle="6 things you can start this week — zero equipment, zero cost, zero expertise"
        />

        <div className="grid gap-4 md:grid-cols-3">
          {cols.map((col) => (
            <div key={col.key} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold text-slate-800">{col.title}</p>
                <p className="mt-0.5 text-[10px] text-slate-500">{col.desc}</p>
              </div>
              <div className="space-y-3 p-3">
                {(launchpad[col.key] ?? []).slice(0, 2).map((item, i) => (
                  <div key={item.id} className="rounded-md border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Action {i + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.action}</p>
                    {item.context ? <p className="mt-1 text-xs text-slate-600">{item.context}</p> : null}
                  </div>
                ))}
                {(launchpad[col.key] ?? []).length === 0 ? (
                  <p className="p-3 text-sm italic text-slate-400">—</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function CoachingSlide({
  keyStrength,
  keyRisk,
  coachingNotes,
  safetyGuidance,
  page,
  totalPages,
  refId,
}: {
  keyStrength: string;
  keyRisk: string;
  coachingNotes: string[];
  safetyGuidance: { id: string; text: string }[];
  page: number;
  totalPages: number;
  refId: string;
}) {
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="11" label="Your Coaching Guide" />
        <SlideTitle title="Your Coaching Guide" />

        <div className="grid gap-4 sm:grid-cols-2">
          <ContentBlock title="Key strength">
            <ProseBlock text={keyStrength} />
          </ContentBlock>
          <ContentBlock title="Key risk">
            <ProseBlock text={keyRisk} />
          </ContentBlock>
        </div>

        <ContentBlock title="Coaching notes" className="mt-4">
          <ul className="space-y-3">
            {coachingNotes.map((note) => (
              <li key={note} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className="shrink-0 font-bold text-slate-400">•</span>
                {note}
              </li>
            ))}
          </ul>
        </ContentBlock>

        {safetyGuidance.length > 0 ? (
          <ContentBlock title="Safety & recovery notes" className="mt-4">
            <ul className="space-y-2">
              {safetyGuidance.map((s) => (
                <li key={s.id} className="text-sm leading-relaxed text-slate-700">
                  {s.text}
                </li>
              ))}
            </ul>
          </ContentBlock>
        ) : null}

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

export function ReportLoadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-400" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

export function ReportExtrasShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="mx-auto mt-10 max-w-[49.625rem]">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {children}
    </div>
  );
}
