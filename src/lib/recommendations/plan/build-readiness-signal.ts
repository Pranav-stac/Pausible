import type { ReadinessSignalType } from "@/lib/recommendations/plan/phase-config";
import { formatReadinessLine, toPlanActionLine } from "@/lib/recommendations/plan/plan-phase-display";
import type { PlanRecommendationItem } from "@/lib/recommendations/types";

function clip(text: string, max: number): string {
  return toPlanActionLine(text, max);
}

function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Turn imperative anchor copy into a readable mid-sentence phrase. */
function imperativeToGerundPhrase(line: string): string {
  let t = line.trim().replace(/\.$/, "");
  const rules: [RegExp, string][] = [
    [/^do\s+/i, "doing "],
    [/^pick\s+/i, "picking "],
    [/^eat\s+/i, "eating "],
    [/^follow\s+/i, "following "],
    [/^train\s+/i, "training "],
    [/^add\s+/i, "adding "],
    [/^keep\s+/i, "keeping "],
    [/^charge\s+/i, "charging "],
    [/^block\s+/i, "blocking "],
    [/^use\s+/i, "using "],
    [/^lay\s+/i, "laying "],
    [/^prep(?:are)?\s+/i, "prepping "],
    [/^rotate\s+/i, "rotating "],
    [/^cut\s+/i, "cutting "],
  ];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(t)) return lowerFirst(t.replace(pattern, replacement));
  }
  return lowerFirst(t);
}

function weeklyFrequencyHint(items: PlanRecommendationItem[]): string | null {
  for (const item of items) {
    const t = item.text;
    const m =
      t.match(/(\d+)\s*[×x]\s*/i) ||
      t.match(/(\d+)\s*(?:sessions?|workouts?|times?)\s*(?:per|\/)\s*week/i) ||
      t.match(/(\d+)\s*(?:days?)\s*(?:per|\/)\s*week/i) ||
      t.match(/(\d+)\s*fixed\s*days/i);
    if (m) return m[1]!;
  }
  return null;
}

function findBackupAction(items: PlanRecommendationItem[]): string | null {
  const hit = items.find((i) =>
    /backup|restart|missed|if you miss|when you miss|recovery|start again|next step|full stop/i.test(
      i.text,
    ),
  );
  return hit ? clip(hit.text, 55) : null;
}

function findSocialAction(items: PlanRecommendationItem[]): string | null {
  const hit = items.find((i) =>
    /accountability|check-?in|partner|buddy|group|together|social/i.test(i.text),
  );
  return hit ? clip(hit.text, 55) : null;
}

function findMindsetAction(items: PlanRecommendationItem[]): string | null {
  const hit = items.find((i) =>
    /good enough|instead of|replace|mindset|failed|perfect/i.test(i.text),
  );
  return hit ? clip(hit.text, 55) : null;
}

/** Build a readiness line from this phase's assigned anchor + rhythm items. */
export function buildPhaseReadinessDescription(args: {
  anchor: PlanRecommendationItem;
  daily: PlanRecommendationItem[];
  weekly: PlanRecommendationItem[];
  primaryType: ReadinessSignalType;
  secondaryType: ReadinessSignalType;
  barriers?: string[];
  templateFallback: string;
}): string {
  const allRhythm = [...args.daily, ...args.weekly];
  const anchorLine = clip(args.anchor.text, 72);
  const anchorGerund = imperativeToGerundPhrase(anchorLine);
  const freq = weeklyFrequencyHint(args.weekly) ?? weeklyFrequencyHint([args.anchor]);
  const backup = findBackupAction(allRhythm);
  const social = findSocialAction(allRhythm);
  const mindset = findMindsetAction(allRhythm);
  const dailyShort = args.daily[0] ? clip(args.daily[0].text, 50) : null;
  const weeklyShort = args.weekly[0] ? clip(args.weekly[0].text, 50) : null;
  const perfectionism = args.barriers?.includes("barrier_perfectionism");

  let body: string;

  switch (args.primaryType) {
    case "consistency":
      if (freq && backup) {
        body = `${freq} sessions per week — especially ${anchorGerund} — feel like defaults, and a miss leads to ${lowerFirst(backup)} instead of stopping`;
      } else if (freq) {
        body = `${freq} sessions per week from your plan feel automatic, especially ${anchorGerund}`;
      } else if (dailyShort && weeklyShort) {
        body = `${anchorGerund}, ${lowerFirst(dailyShort)}, and ${lowerFirst(weeklyShort)} feel like your normal routine`;
      } else if (dailyShort) {
        body = `${anchorGerund} and ${lowerFirst(dailyShort)} feel like defaults, not daily decisions`;
      } else {
        body = `${anchorGerund} feels like a default habit, not something you debate each day`;
      }
      break;

    case "recovery":
      if (backup) {
        body = `a missed session triggers ${lowerFirst(backup)} instead of abandoning ${anchorGerund}`;
      } else if (freq) {
        body = `you recover within a day after missing one of your ${freq} weekly sessions and return to ${anchorGerund}`;
      } else {
        body = `a disruption doesn't end the plan — you restart with ${anchorGerund}`;
      }
      break;

    case "emotional_comfort":
      if (dailyShort) {
        body = `${anchorGerund} and ${lowerFirst(dailyShort)} feel manageable, not stressful`;
      } else {
        body = `${anchorGerund} no longer feels effortful or anxiety-producing`;
      }
      break;

    case "social_embedding":
      if (social) {
        body = `${lowerFirst(social)} runs without you having to initiate every time`;
      } else if (backup) {
        body = `your routine holds when others aren't available — you use ${lowerFirst(backup)}`;
      } else {
        body = `${anchorGerund} stays steady with the accountability built into this phase`;
      }
      break;

    case "performance":
      if (weeklyShort && freq) {
        body = `you're hitting ${anchorGerund} and ${lowerFirst(weeklyShort)} consistently for two weeks`;
      } else if (weeklyShort) {
        body = `${anchorGerund} and ${lowerFirst(weeklyShort)} are reliable for two consecutive weeks`;
      } else {
        body = `${anchorGerund} is consistent for two weeks without slipping`;
      }
      break;

    case "engagement":
      body = dailyShort
        ? `you've completed a full week of ${anchorGerund} and ${lowerFirst(dailyShort)} without switching to a new plan`
        : `you've completed a full week of ${anchorGerund} without switching to a completely different plan`;
      break;

    default:
      return formatReadinessLine(args.templateFallback);
  }

  if (
    args.secondaryType === "recovery" &&
    args.primaryType !== "recovery" &&
    backup &&
    !/miss|backup|restart/i.test(body)
  ) {
    body += `, and a miss leads to ${lowerFirst(backup)} rather than a full stop`;
  }

  if (perfectionism && mindset) {
    body += `, and ${lowerFirst(mindset)} counts as success`;
  } else if (perfectionism) {
    body += ` — "good enough" counts as success`;
  }

  const line = formatReadinessLine(body);
  if (!line || line.length < 24) return formatReadinessLine(args.templateFallback);
  if (line.length > 220) return formatReadinessLine(clip(body, 190));
  return line;
}
