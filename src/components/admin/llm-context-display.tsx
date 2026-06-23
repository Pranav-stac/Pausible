"use client";

import type { AttemptLlmSectionContext } from "@/lib/recommendations/build-attempt-llm-context";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type {
  OpportunityCard,
  PrimaryPatternSection,
  SecondaryPatternSection,
} from "@/lib/recommendations/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function TagPills({ items }: { items: { tag?: string; label?: string }[] | string[] }) {
  if (!items.length) return <p className="text-[11px] text-slate-400">—</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => {
        const label = typeof item === "string" ? item : (item.label ?? item.tag ?? "");
        const key = typeof item === "string" ? item : (item.tag ?? item.label ?? String(i));
        return (
          <li key={key} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{trimmed}</p>
    </div>
  );
}

function BehaviouralBoxes({ boxes }: { boxes: { title: string; content: string }[] }) {
  if (!boxes.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Behavioural boxes</p>
      {boxes.map((box) => (
        <div key={box.title} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-slate-900">{box.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{box.content}</p>
        </div>
      ))}
    </div>
  );
}

function TraitDeviations({
  items,
}: {
  items: { trait: string; direction: string; content: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Trait deviations</p>
      {items.map((item) => (
        <div key={`${item.trait}-${item.direction}`} className="rounded-lg border border-violet-100 bg-violet-50/40 px-3 py-2.5">
          <p className="text-xs font-semibold text-violet-900">
            {item.trait} · {item.direction}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.content}</p>
        </div>
      ))}
    </div>
  );
}

function ActionList({
  title,
  items,
  actionKey,
  whyKey,
}: {
  title: string;
  items: Record<string, unknown>[];
  actionKey: string;
  whyKey: string;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-sm font-medium text-slate-900">{asString(item[actionKey])}</p>
          {asString(item[whyKey]) ? (
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{asString(item[whyKey])}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function OpportunityCardsList({ cards }: { cards: OpportunityCard[] }) {
  if (!cards.length) return <p className="text-[11px] text-slate-400">No priority cards.</p>;
  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div key={card.id} className="rounded-lg border border-sky-100 bg-sky-50/50 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-800">
              {card.pillar}
            </span>
            <span className="font-mono text-[10px] text-slate-500">{card.id}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">{card.headline}</p>
          <p className="mt-1 text-[11px] text-slate-600">{card.whyItMatters}</p>
          <p className="mt-1 text-[11px] font-medium text-emerald-800">Start this week: {card.startThisWeek}</p>
        </div>
      ))}
    </div>
  );
}

function GenericStructuredView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data == null) return <p className="text-[11px] text-slate-400">—</p>;
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return <p className="text-sm text-slate-800">{String(data)}</p>;
  }
  if (Array.isArray(data)) {
    if (!data.length) return <p className="text-[11px] text-slate-400">Empty list</p>;
    return (
      <ul className={`space-y-2 ${depth > 0 ? "ml-3 border-l border-slate-200 pl-3" : ""}`}>
        {data.map((item, i) => (
          <li key={i}>
            <GenericStructuredView data={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (!isRecord(data)) return <p className="text-sm text-slate-800">{String(data)}</p>;

  return (
    <dl className={`grid gap-2 ${depth > 0 ? "" : "sm:grid-cols-2"}`}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className={Array.isArray(value) || isRecord(value) ? "sm:col-span-2" : ""}>
          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{key.replace(/_/g, " ")}</dt>
          <dd className="mt-0.5">
            <GenericStructuredView data={value} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function OutputSchemaView({ schema }: { schema: Record<string, unknown> }) {
  const entries = Object.entries(schema);
  if (!entries.length) return <p className="text-[11px] text-slate-400">—</p>;
  return (
    <ul className="space-y-1 text-[11px] text-slate-700">
      {entries.map(([key, value]) => (
        <li key={key} className="flex gap-2">
          <span className="font-mono text-slate-500">{key}</span>
          <span className="text-slate-400">→</span>
          <span>{typeof value === "string" ? value : JSON.stringify(value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function LlmInputDataView({ sectionId, data }: { sectionId: string; data: Record<string, unknown> }) {
  if (sectionId === "primary_pattern") {
    return (
      <div className="space-y-3">
        <TextBlock label="Success condition" text={asString(data.successConditionText)} />
        <TextBlock label="Strength insight" text={asString(data.strengthInsightText)} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Goals</p>
          <div className="mt-1">
            <TagPills items={(data.goals as { tag: string; label: string }[]) ?? []} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Barriers</p>
          <div className="mt-1">
            <TagPills items={(data.barriers as { tag: string; label: string }[]) ?? []} />
          </div>
        </div>
      </div>
    );
  }

  if (sectionId === "secondary_pattern") {
    return (
      <div className="space-y-3">
        <TextBlock
          label="Blend ratio"
          text={
            typeof data.blendRatio === "number"
              ? Number.isFinite(data.blendRatio)
                ? data.blendRatio.toFixed(3)
                : "∞"
              : ""
          }
        />
        <TextBlock label="Blend strength" text={asString(data.blendStrength)} />
        <TextBlock label="Secondary success condition" text={asString(data.secondarySuccessConditionText)} />
        <TextBlock label="Secondary strength insight" text={asString(data.secondaryStrengthInsightText)} />
      </div>
    );
  }

  if (sectionId === "blind_spots") {
    return (
      <div className="space-y-3">
        <TextBlock label="Blind spot" text={asString(data.blindSpotText)} />
        <TextBlock label="Pattern prediction" text={asString(data.patternPredictionText)} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Goals</p>
          <div className="mt-1">
            <TagPills items={(data.goals as { tag: string; label: string }[]) ?? []} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Barriers</p>
          <div className="mt-1">
            <TagPills items={(data.barriers as { tag: string; label: string }[]) ?? []} />
          </div>
        </div>
      </div>
    );
  }

  if (sectionId.startsWith("pillar_")) {
    const dos = Array.isArray(data.dos) ? (data.dos as Record<string, unknown>[]) : [];
    const donts = Array.isArray(data.donts) ? (data.donts as Record<string, unknown>[]) : [];
    return (
      <div className="space-y-3">
        <TextBlock label="Pillar" text={asString(data.pillar)} />
        <TextBlock label="Mindset shift" text={asString(data.mindsetShift)} />
        {dos.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Selected dos</p>
            {dos.map((item) => (
              <div key={asString(item.id)} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                <p className="font-mono text-[10px] text-slate-500">{asString(item.id)}</p>
                <p className="mt-0.5 text-sm text-slate-800">{asString(item.text)}</p>
              </div>
            ))}
          </div>
        ) : null}
        {donts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">Selected don&apos;ts</p>
            {donts.map((item) => (
              <div key={asString(item.id)} className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2">
                <p className="font-mono text-[10px] text-slate-500">{asString(item.id)}</p>
                <p className="mt-0.5 text-sm text-slate-800">{asString(item.text)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (sectionId === "high_impact_priorities") {
    const cards = Array.isArray(data.cards) ? (data.cards as Record<string, unknown>[]) : [];
    return (
      <div className="space-y-2">
        {cards.map((card) => (
          <div key={asString(card.id)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              #{asString(card.rank)} · {asString(card.pillar)}
            </p>
            <p className="mt-1 text-sm text-slate-800">{asString(card.personaContextText)}</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Score {asString(card.clusterScore)} · {asString(card.id)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return <GenericStructuredView data={data} />;
}

export function LlmOutputView({ sectionId, output }: { sectionId: string; output: unknown }) {
  if (output == null) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
        No stored output for this section (report not generated yet or section was skipped).
      </p>
    );
  }

  if (sectionId === "primary_pattern" && isRecord(output)) {
    if (output._legacy) {
      return <GenericStructuredView data={output} />;
    }
    const pattern = output as unknown as PrimaryPatternSection;
    return (
      <div className="space-y-3">
        <TextBlock label="Persona narrative" text={pattern.personaNarrative ?? ""} />
        <BehaviouralBoxes boxes={pattern.behaviouralBoxes ?? []} />
        <TraitDeviations items={pattern.traitDeviations ?? []} />
      </div>
    );
  }

  if (sectionId === "secondary_pattern" && isRecord(output)) {
    const pattern = output as unknown as SecondaryPatternSection;
    return (
      <div className="space-y-3">
        <TextBlock label="Secondary narrative" text={pattern.secondaryNarrative ?? ""} />
        <BehaviouralBoxes boxes={pattern.behaviouralBoxes ?? []} />
        <TextBlock label="Blend narrative" text={pattern.blendNarrative ?? ""} />
      </div>
    );
  }

  if (sectionId === "blind_spots" && isRecord(output)) {
    return (
      <div className="space-y-3">
        <TextBlock label="Pattern body" text={asString(output.patternBody ?? output.heading)} />
        <TextBlock label="Goals body" text={asString(output.goalsBody ?? output.body)} />
      </div>
    );
  }

  if (sectionId.startsWith("pillar_") && isRecord(output)) {
    return (
      <div className="space-y-3">
        <TextBlock label="Focus area" text={asString(output.focusArea)} />
        <TextBlock label="Focus reason" text={asString(output.focusReason)} />
        <ActionList
          title="Dos"
          items={Array.isArray(output.dos) ? (output.dos as Record<string, unknown>[]) : []}
          actionKey="action"
          whyKey="why"
        />
        <ActionList
          title="Don'ts"
          items={Array.isArray(output.donts) ? (output.donts as Record<string, unknown>[]) : []}
          actionKey="behavior"
          whyKey="why"
        />
      </div>
    );
  }

  if (sectionId === "high_impact_priorities" && Array.isArray(output)) {
    return <OpportunityCardsList cards={output as OpportunityCard[]} />;
  }

  return <GenericStructuredView data={output} />;
}

export function LlmSharedContextView({ context }: { context: GeminiSynthesisContext }) {
  const wellnessGrouped = context.wellnessResponses.reduce<Map<string, typeof context.wellnessResponses>>(
    (map, row) => {
      const list = map.get(row.section) ?? [];
      list.push(row);
      map.set(row.section, list);
      return map;
    },
    new Map(),
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h5 className="text-xs font-semibold text-slate-900">Personality</h5>
        <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase text-slate-500">Primary</dt>
            <dd>{context.personality.primaryPersona}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-slate-500">Secondary</dt>
            <dd>{context.personality.secondaryPersona}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-slate-500">Fit</dt>
            <dd>
              {context.personality.fitTier} · {context.personality.fitScore}% · ratio{" "}
              {Number.isFinite(context.personality.blendRatio)
                ? context.personality.blendRatio.toFixed(3)
                : "∞"}{" "}
              · {context.personality.blendStrength}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h5 className="text-xs font-semibold text-slate-900">Matched profile</h5>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Goals</p>
            <div className="mt-1">
              <TagPills items={context.matchedProfile.goals} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Barriers</p>
            <div className="mt-1">
              <TagPills items={context.matchedProfile.barriers} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <h5 className="text-xs font-semibold text-slate-900">
          Ranked recommendations ({context.rankedRecommendations.length})
        </h5>
        <p className="mt-1 text-[11px] text-slate-600">
          Top score: {context.rankedRecommendations[0]?.totalScore ?? "—"} · Selected plan uses PI series + pillar
          picks from this pool.
        </p>
      </section>

      {[...wellnessGrouped.entries()].map(([section, rows]) => (
        <section key={section} className="rounded-lg border border-slate-200 bg-white">
          <h5 className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-900">{section}</h5>
          <div className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <div key={`${section}-${i}`} className="px-3 py-2">
                <p className="text-[11px] font-medium text-slate-800">{row.question}</p>
                <p className="mt-0.5 text-sm text-slate-900">{row.answer}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function LlmSectionTabs({ section }: { section: AttemptLlmSectionContext }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Prompt sent to LLM</p>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-sky-100 bg-sky-50/50 p-3 font-mono text-[10px] leading-relaxed text-slate-800">
          {section.userPrompt || "(empty)"}
        </pre>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">LLM response</p>
        <div className="mt-2 rounded-lg border border-emerald-100 bg-white p-3">
          <LlmOutputView sectionId={section.id} output={section.output} />
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Structured input data</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <LlmInputDataView sectionId={section.id} data={section.inputData} />
        </div>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-slate-700">
          Expected output schema
        </summary>
        <div className="border-t border-slate-100 px-3 py-2">
          <OutputSchemaView schema={section.outputSchema} />
        </div>
      </details>
    </div>
  );
}
