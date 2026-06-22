import type { PersonaKey } from "@/lib/scoring/persona-types";
import type { CoachGuidePillarMatrix } from "@/lib/coach-guide/types";

export type PersonaCoachProfile = {
  operatingStyle: string;
  naturalStrength: string;
  primaryRisk: string;
  bestSetup: string;
  blindSpot: string;
  blindSpotCoachResponse: string;
  riskSignals: { signal: string; meaning: string }[];
  fiveWordSummary: string;
  pillarMatrix: CoachGuidePillarMatrix;
  reviewNote: string;
};

const PILLARS = ["Physical Activity", "Nutrition", "Sleep & Recovery", "Mental Wellness"] as const;

function matrix(
  structure: string[],
  environment: string[],
  progression: string[],
  recovery: string[],
): CoachGuidePillarMatrix {
  const out: CoachGuidePillarMatrix = {
    structure: {},
    environment: {},
    progression: {},
    recoveryProtocol: {},
  };
  PILLARS.forEach((p, i) => {
    out.structure[p] = structure[i] ?? "";
    out.environment[p] = environment[i] ?? "";
    out.progression[p] = progression[i] ?? "";
    out.recoveryProtocol[p] = recovery[i] ?? "";
  });
  return out;
}

export const PERSONA_COACH_PROFILE: Record<PersonaKey, PersonaCoachProfile> = {
  stress_sensitive: {
    operatingStyle: "Observant, private, detail-sensitive",
    naturalStrength: "Self-awareness and accurate body feedback",
    primaryRisk: "Extended pause after single disruption",
    bestSetup: "Private tracker, written plan, quiet environment",
    blindSpot:
      "One disruption triggers an extended pause. The cost is not the missed session but the days spent waiting to feel ready again.",
    blindSpotCoachResponse:
      "Pre-write a restart protocol. Make the restart action specific and effortless. The next session is always session #2, never a restart.",
    riskSignals: [
      { signal: "Extended silence after a missed session", meaning: "Shame-withdrawal cycle. The silence is not compliance — it is avoidance. Check in privately." },
      { signal: "Sudden over-compliance or intensification", meaning: "Burnout precursor. They are overcompensating rather than adjusting." },
      { signal: "Requests to start over or redo the plan", meaning: "Perfectionism trigger. Help refine, do not allow a full reset." },
    ],
    fiveWordSummary: "Small. Private. Written. Structured. Safe.",
    reviewNote: "Let them settle in. Keep check-ins private and low-pressure.",
    pillarMatrix: matrix(
      ["3x/week, fixed written days. 15-min backup for low-energy days.", "Regular meal times. One change at a time. Written rules, not intuitive.", "Gradual shift (15-min test). Wind-down routine after work.", "One small task/day. Proof-based confidence — checkmarks and logs."],
      ["Quiet gym or off-peak hours. Home workouts are strong option. No group pressure.", "Pre-stocked backup meals. No social eating pressure.", "Non-work buffer before bed. Screen brightness reduction.", "Private check-ins only. No public accountability."],
      ["Start conservative. Let them observe body response first. They speed up naturally.", "Add one food rule per 2 weeks. No full overhauls.", "Test for 1 week before committing. Frame as experiment.", "Repeat 1 healthy action 3x/week before adding new ones."],
      ["Pre-written restart: 'If I miss, I do [X] next day.' Next session = #2, never restart.", "One off meal is contained. Backup meal prevents spiral.", "Bad night = adjust next day's load. No sleep-first pressure.", "Start the task when flat. Action before motivation."],
    ),
  },
  self_regulated_planner: {
    operatingStyle: "Structured, self-regulated, routine-driven",
    naturalStrength: "Consistency once system is in place",
    primaryRisk: "Rigidity; struggles when routine breaks",
    bestSetup: "Predictable schedules with built-in flexibility",
    blindSpot: "Confuses routine compliance with actual progress. May follow the plan perfectly but not notice it stopped working weeks ago.",
    blindSpotCoachResponse: "Periodically challenge the plan itself, not just execution. Ask: 'Is this still moving you forward?'",
    riskSignals: [
      { signal: "Rigid adherence even when results plateau", meaning: "Over-attachment to the system. Needs permission to adapt without feeling like a failure." },
      { signal: "Resistance to any plan modification", meaning: "Routine identity is blocking necessary adjustment." },
      { signal: "Anxiety when routine is disrupted", meaning: "Disruption feels like failure rather than normal variance." },
    ],
    fiveWordSummary: "Consistent. Structured. Predictable. Systematic. Reliable.",
    reviewNote: "Check if they are plateauing without noticing.",
    pillarMatrix: matrix(
      ["Fixed weekly schedule. Same days, same times. Detailed program with sets/reps.", "Structured meal plan with specific portions. Weekly prep routine.", "Fixed sleep/wake times. Non-negotiable routine.", "Weekly review ritual. Journaling or structured reflection."],
      ["Consistent location. Same gym, same setup. Predictable environment.", "Controlled food environment. Meal prep station. Consistent grocery list.", "Bedroom optimized for sleep. Temperature, darkness, no devices.", "Scheduled check-ins. Same cadence, same format."],
      ["Linear progression. Systematic overload. Clear program phases.", "Add complexity in structured phases. No sudden changes.", "Optimize existing routine before adding new elements.", "Expand reflection scope gradually. Same system, deeper questions."],
      ["Built-in deload weeks. Recovery is part of the plan, not an exception.", "Planned flexibility meals. Not cheats — scheduled variation.", "Travel/disruption protocol written in advance.", "Routine-break plan: what to do when the system is disrupted."],
    ),
  },
  social_motivator: {
    operatingStyle: "Social, energetic, group-motivated",
    naturalStrength: "Momentum from shared accountability",
    primaryRisk: "Drops off when alone or isolated",
    bestSetup: "Group activities, workout partners, shared tracking",
    blindSpot: "Mistakes social energy for personal commitment. Feels motivated in the group but has no system for when they are alone.",
    blindSpotCoachResponse: "Build a solo fallback into every group plan. Test: can they do one session alone this week?",
    riskSignals: [
      { signal: "Skips sessions when workout partner is unavailable", meaning: "Has not built internal motivation. The group was carrying them." },
      { signal: "Drops tracking when not being watched", meaning: "External accountability replaced intrinsic follow-through." },
      { signal: "Energy crashes after group accountability ends", meaning: "Social structure was the engine, not personal habit." },
    ],
    fiveWordSummary: "Social. Shared. Energetic. Connected. Supported.",
    reviewNote: "Ensure solo backup exists.",
    pillarMatrix: matrix(
      ["Group classes or partner workouts. Shared schedule. Social commitment.", "Shared meals or meal prep with friend/partner. Social eating is fine.", "Wind-down with low-key social activity. Evening calls or walks.", "Share progress with trusted person. Talk-through not write-down."],
      ["Busy gym, group energy. Classes > solo sessions. Workout buddy system.", "Social food environments are fine. Cook-with-friends sessions.", "Household alignment matters. Partner sleep schedule.", "Public check-ins welcome. Group challenges can work."],
      ["Challenge-based: team goals, friendly competitions. New class formats.", "Learn new cuisines together. Cooking challenges.", "Family/household sleep improvement as team goal.", "Celebrate wins socially. Share milestones."],
      ["Solo backup workout pre-written. Must work without the group.", "Solo meal plan for days without social support.", "Independent routine for nights alone.", "Self-check-in tool for when no one is watching."],
    ),
  },
  curious_explorer: {
    operatingStyle: "Explorative, adaptable, variety-seeking",
    naturalStrength: "Quick adoption of new approaches",
    primaryRisk: "Boredom and plan abandonment",
    bestSetup: "Rotating routines, new challenges, learning-framed goals",
    blindSpot: "Confuses exploring new approaches with making progress. Constantly starts but rarely builds depth in any one system.",
    blindSpotCoachResponse: "Set a minimum commitment window (e.g., 4 weeks) before any plan change is allowed.",
    riskSignals: [
      { signal: "Requests to change the plan every 1–2 weeks", meaning: "Novelty-seeking, not plan failure. Hold the commitment window." },
      { signal: "Researching alternative approaches mid-plan", meaning: "Redirect curiosity within the plan instead of replacing it." },
      { signal: "Excitement about a new method before finishing current one", meaning: "Hold commitment. Add variation inside the existing structure." },
    ],
    fiveWordSummary: "Fresh. Flexible. Explorative. Learning. Evolving.",
    reviewNote: "Redirect novelty-seeking within the plan.",
    pillarMatrix: matrix(
      ["Rotating formats within a framework. 4-week blocks with variety built in.", "Experiment with new foods/recipes within guardrails. Flexible meal structure.", "Multiple wind-down options. Pick what suits tonight.", "Learning-framed tasks. 'This week, test whether X works for you.'"],
      ["Different settings welcome. Outdoor, gym, home rotation.", "New restaurants or cuisines are fine within nutritional framework.", "Bedroom setup can evolve. Test different conditions.", "Flexible check-in formats. Voice, text, video — let them choose."],
      ["New skills or modalities. Depth through breadth.", "Advanced techniques or food knowledge. Link nutrition to performance.", "Sleep tracking with data to explore. Gamify the process.", "Self-experiments: track one variable per week."],
      ["New-approach redirect: 'try this variation' not 'go back to the plan.'", "Reframe off meals as data. 'What did you learn?'", "Poor sleep = test a different condition tonight.", "Boredom is the signal — add novelty, not discipline."],
    ),
  },
  resilient_performer: {
    operatingStyle: "Driven, performance-oriented, disciplined",
    naturalStrength: "Intensity and follow-through under pressure",
    primaryRisk: "Overtraining and ignoring recovery signals",
    bestSetup: "Clear targets, measurable progress, structured recovery",
    blindSpot: "Pushes through warning signals from their body. Reads fatigue as weakness rather than a recovery need.",
    blindSpotCoachResponse: "Build mandatory recovery rules into the plan. Frame rest as performance strategy, not weakness.",
    riskSignals: [
      { signal: "Training through pain or illness", meaning: "Competitive override. Enforce recovery as non-negotiable." },
      { signal: "Dismissing recovery recommendations", meaning: "Rest is being reframed as weakness — correct the frame." },
      { signal: "Increasing volume or intensity without coach input", meaning: "Performance drive bypassing body's signals." },
    ],
    fiveWordSummary: "Clear. Measurable. Challenging. Earned. Proven.",
    reviewNote: "Set recovery expectations early.",
    pillarMatrix: matrix(
      ["Periodized program. Clear targets per phase. Performance metrics.", "Macro targets with precision. Performance-linked nutrition.", "Sleep as performance tool. Track and optimize.", "Goal-setting rituals. Measurable milestones."],
      ["Performance gym. Serious training environment. May benefit from training partner.", "Controlled food prep. Performance kitchen setup.", "Recovery-optimized bedroom. Blackout, temperature control.", "Direct, honest check-ins. No sugarcoating."],
      ["Data-driven overload. Test maxes regularly. Compete with own records.", "Precision increase: fine-tune macros as performance demands.", "Advanced recovery: HRV, sleep staging, nap protocols.", "Raise targets when current ones feel easy. Never plateau."],
      ["Mandatory deload. Rest framed as performance strategy. Non-negotiable.", "Recovery nutrition is part of the plan. Not optional.", "Sleep debt = reduced training load next session.", "Acknowledge limits without framing as weakness."],
    ),
  },
  brittle_avoidant: {
    operatingStyle: "Cautious, self-protective, deliberate",
    naturalStrength: "Filtering out bad-fit plans early",
    primaryRisk: "Avoidance and withdrawal under pressure",
    bestSetup: "2–3 simple habits, visible progress, zero-pressure starts",
    blindSpot: "Interprets any discomfort as a sign the plan is wrong. Abandons setups before giving them time to work.",
    blindSpotCoachResponse: "Set expectations upfront: discomfort in week 1–2 is normal. Distinguish bad fit from adjustment period.",
    riskSignals: [
      { signal: "Stops tracking without explanation", meaning: "Pre-withdrawal. They have already mentally quit. Simplify immediately." },
      { signal: "Avoids check-in conversations", meaning: "Shame or overwhelm — reduce pressure, not add structure." },
      { signal: "Plans to 'start fresh next month'", meaning: "Delay pattern. Simplify the current plan instead of resetting." },
    ],
    fiveWordSummary: "Tiny. Simple. Effortless. Gentle. Patient.",
    reviewNote: "Let them settle in with zero-pressure communication.",
    pillarMatrix: matrix(
      ["2 sessions/week max to start. Extremely simple. One exercise type.", "One meal change only. Smallest possible step. No tracking at first.", "One small bedtime adjustment. No system overhaul.", "One action per week. Celebrate completion, not ambition."],
      ["Home preferred. Zero social exposure. Completely private.", "Food at home. No meal prep pressure. Simplest possible meals.", "Minimal changes to bedroom. Nothing that feels like effort.", "No check-ins unless they initiate. Zero-pressure communication."],
      ["Only add when they ask. Wait for them to say 'I want more.' Never push.", "Add a second change only after 3+ weeks of success with the first.", "Deepen only when current habit is effortless.", "Build from proof: 'You did this 3 times. Ready for something new?'"],
      ["Any movement counts. 5-min walk = success. Redefine the bar extremely low.", "No guilt framing ever. One off meal is irrelevant to the plan.", "Bad night = no consequences. Just try again tomorrow.", "Distinguish adjustment discomfort from genuine bad fit."],
    ),
  },
};

export function secondaryInteractionPattern(secondary: PersonaKey): string {
  if (secondary === "brittle_avoidant" || secondary === "stress_sensitive") return "caution";
  if (secondary === "social_motivator" || secondary === "curious_explorer") return "social";
  if (secondary === "self_regulated_planner" || secondary === "resilient_performer") return "structure";
  return "neutral";
}
