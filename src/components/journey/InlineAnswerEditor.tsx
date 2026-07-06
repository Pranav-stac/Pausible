"use client";

import {
  ageBandTagFromYears,
  computeAgeYearsFromDate,
  parseIsoDate,
  WELLNESS_DATE_OF_BIRTH_KEY,
} from "@/lib/recommendations/compute-wellness-age";
import { WELLNESS_CONTEXT_PREFIX } from "@/data/wellness-context-questionnaire";
import type { AssessmentQuestion, AttemptAnswers } from "@/types/models";

const WELLNESS_AGE_RANGE_KEY = `${WELLNESS_CONTEXT_PREFIX}age_range`;

const AGE_BAND_TAG_TO_OPTION: Record<string, string> = {
  age_under_18: "Under 18",
  age_18_24: "18–24",
  age_25_34: "25–34",
  age_35_44: "35–44",
  age_45_54: "45–54",
  age_55_plus: "55+",
};

function ageBandOptionFromDob(iso: string): string | null {
  const dob = parseIsoDate(iso);
  if (!dob) return null;
  const tag = ageBandTagFromYears(computeAgeYearsFromDate(dob));
  return AGE_BAND_TAG_TO_OPTION[tag] ?? null;
}

function LikertScale({
  value,
  onChange,
  scaleMin = 1,
  scaleMax = 5,
  minLabel,
  maxLabel,
}: {
  value?: number;
  onChange: (n: number) => void;
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
}) {
  const min = Math.min(scaleMin, scaleMax);
  const max = Math.max(scaleMin, scaleMax);
  const nums: number[] = [];
  for (let n = min; n <= max; n++) nums.push(n);
  const colTemplate = `repeat(${nums.length}, minmax(0, 1fr))`;
  const neutralAbove = (n: number) => n === 4 && n > min && n < max;

  return (
    <div>
      <div className="mb-3 flex justify-between gap-2 text-[10px] font-medium leading-tight text-slate-500 sm:text-xs">
        <span className="min-w-0 shrink text-left">{minLabel ?? "Strongly Disagree"}</span>
        <span className="min-w-0 shrink text-right">{maxLabel ?? "Strongly Agree"}</span>
      </div>
      {nums.some(neutralAbove) ? (
        <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: colTemplate }}>
          {nums.map((n) => (
            <div key={`cap-${n}`} className="flex min-h-[1rem] flex-col justify-end pb-0.5 text-center">
              <span
                className={`text-[9px] font-semibold uppercase leading-none tracking-wide sm:text-[10px] ${
                  neutralAbove(n) ? "text-slate-400" : "invisible select-none"
                }`}
              >
                Neutral
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="mt-1 grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: colTemplate }}>
        {nums.map((n) => {
          const pressed = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={pressed}
              className={`flex min-h-[2.5rem] w-full flex-col items-center justify-center rounded-xl border px-0.5 py-2 text-sm font-bold transition sm:min-h-[2.75rem] sm:rounded-2xl ${
                pressed
                  ? "border-transparent bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-900 hover:border-[#2D82FF]/50"
              }`}
            >
              <span className="tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SingleChoice({
  options,
  value,
  onChange,
}: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`flex w-full min-h-[2.75rem] items-center rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              active
                ? "border-[#2D82FF]/50 bg-[#F7F9FB] text-[#0D1B2A] shadow-inner"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoice({
  options,
  value,
  maxSelections,
  onChange,
}: {
  options: string[];
  value: string[];
  maxSelections?: number;
  onChange: (v: string[]) => void;
}) {
  const cap = maxSelections ?? options.length;
  const atCap = value.length >= cap;

  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt));
    else if (!atCap) onChange([...value, opt]);
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex w-full min-h-[2.75rem] items-center rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              active
                ? "border-[#2D82FF]/50 bg-[#F7F9FB] text-[#0D1B2A]"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export type InlineAnswerDraft = {
  value: number | string | string[];
  /** Extra answer keys updated alongside the primary question (e.g. DOB → age band). */
  extra?: Record<string, string>;
};

export function InlineAnswerEditor({
  question,
  answers,
  draft,
  onDraftChange,
}: {
  question: AssessmentQuestion;
  answers: AttemptAnswers;
  draft: InlineAnswerDraft;
  onDraftChange: (next: InlineAnswerDraft) => void;
}) {
  if (question.type === "likert") {
    const val = typeof draft.value === "number" ? draft.value : undefined;
    return (
      <LikertScale
        scaleMin={question.scaleMin ?? 1}
        scaleMax={question.scaleMax ?? 5}
        minLabel={question.scaleMinLabel}
        maxLabel={question.scaleMaxLabel}
        value={val}
        onChange={(n) => onDraftChange({ value: n })}
      />
    );
  }

  if (question.type === "single") {
    const val = typeof draft.value === "string" ? draft.value : undefined;
    const isAgeRange = question.id === WELLNESS_AGE_RANGE_KEY;
    const dob =
      typeof answers[WELLNESS_DATE_OF_BIRTH_KEY] === "string" ? answers[WELLNESS_DATE_OF_BIRTH_KEY] : "";
    const draftDob = draft.extra?.[WELLNESS_DATE_OF_BIRTH_KEY] ?? dob;

    return (
      <div className="space-y-4">
        {isAgeRange ? (
          <div>
            <label htmlFor={`${question.id}-dob`} className="mb-2 block text-xs font-semibold text-slate-700">
              Date of birth
            </label>
            <input
              id={`${question.id}-dob`}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={draftDob}
              onChange={(e) => {
                const iso = e.target.value;
                const band = ageBandOptionFromDob(iso);
                onDraftChange({
                  value: band ?? (typeof draft.value === "string" ? draft.value : ""),
                  extra: { [WELLNESS_DATE_OF_BIRTH_KEY]: iso },
                });
              }}
              className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-[#2D82FF] focus:outline-none focus:ring-2 focus:ring-[#2D82FF]/25"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Or pick an age band below if you prefer not to enter your exact date.
            </p>
          </div>
        ) : null}
        <SingleChoice
          options={question.options ?? []}
          value={val}
          onChange={(v) => onDraftChange({ value: v, extra: isAgeRange ? draft.extra : undefined })}
        />
      </div>
    );
  }

  const multiVal = Array.isArray(draft.value) ? draft.value : [];
  return (
    <MultiChoice
      options={question.options ?? []}
      maxSelections={question.maxSelections}
      value={multiVal}
      onChange={(v) => onDraftChange({ value: v })}
    />
  );
}
