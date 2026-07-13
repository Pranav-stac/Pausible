import type { AssessmentDefinition, AssessmentQuestion } from "@/types/models";

/** Prefix for wellness-context answer keys (stored alongside OCEAN item codes on the attempt). */
export const WELLNESS_CONTEXT_PREFIX = "wc_";

export const wellnessContextAssessmentId = "wellness-context";

const CQ08_TRIGGERS_08A = [
  "Cardio or endurance",
  "Mind-body or flexibility",
  "Learning a skill or sport",
] as const;

/**
 * Wellness Context Questionnaire v1.5 — 17 active questions (+ CQ08a conditional).
 * CQ10 and CQ19 removed; CQ08a added for activity preferences.
 * @see FinalData/NewFinalData/Pausibl_Contextual_Questions_tags_v1.5.xlsx
 */
export function buildWellnessContextQuestionnaire(): AssessmentDefinition {
  const w = (id: string) => `${WELLNESS_CONTEXT_PREFIX}${id}`;

  const questions: AssessmentDefinition["questions"] = {
    [w("age_range")]: {
      id: w("age_range"),
      prompt: "What is your date of birth?",
      caption: "We use your age band only — not your exact birth date — to tailor safety and framing.",
      type: "single",
      options: ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"],
      weights: {},
    },
    [w("gender")]: {
      id: w("gender"),
      prompt: "What is your gender?",
      type: "single",
      options: ["Male", "Female", "Non-binary", "Prefer not to say"],
      weights: {},
    },
    [w("work_lifestyle")]: {
      id: w("work_lifestyle"),
      prompt: "What is the nature of your work?",
      type: "single",
      options: [
        "Desk-based",
        "Physically demanding",
        "Travel-heavy",
        "Student",
        "Not in active employment",
      ],
      weights: {},
    },
    [w("stress_level")]: {
      id: w("stress_level"),
      prompt: "How stressful is your routine on most days?",
      type: "single",
      options: ["Low — rarely stressed", "Moderate", "High — often stressed"],
      weights: {},
    },
    [w("wellness_time")]: {
      id: w("wellness_time"),
      prompt: "How much time can you set aside for physical activity on most days?",
      type: "single",
      options: ["Under 30 minutes", "30–45 minutes", "45–60 minutes", "Over 60 minutes"],
      weights: {},
    },
    [w("fitness_level")]: {
      id: w("fitness_level"),
      prompt: "Which best describes your current fitness level?",
      type: "single",
      options: [
        "New to exercise",
        "Returning after a break",
        "Exercise occasionally",
        "Train regularly",
      ],
      weights: {},
    },
    [w("daily_activity")]: {
      id: w("daily_activity"),
      prompt: "How active are you on a typical day?",
      type: "single",
      options: ["Mostly sitting", "Lightly active", "Moderately active", "Very active"],
      weights: {},
    },
    [w("preferred_activities")]: {
      id: w("preferred_activities"),
      prompt: "What kind of physical activity interests you?",
      caption: "Select up to 2",
      type: "multi",
      maxSelections: 2,
      options: [
        "Strength or resistance training",
        "Cardio or endurance",
        "Mind-body or flexibility",
        "Learning a skill or sport",
        "Open to anything",
      ],
      weights: {},
    },
    [w("preferred_activity_details")]: {
      id: w("preferred_activity_details"),
      prompt: "Which of these specifically?",
      caption: "Select all that apply",
      type: "multi",
      options: [
        "Running/jogging",
        "Cycling",
        "Swimming",
        "Walking",
        "HIIT",
        "Yoga",
        "Pilates",
        "Stretching",
        "Dance",
        "Tai chi",
        "Martial arts",
        "A team sport",
        "A racquet sport",
        "Dance form",
        "Swimming (learning)",
      ],
      optionGroups: [
        {
          whenParentIncludes: "Cardio or endurance",
          options: ["Running/jogging", "Cycling", "Swimming", "Walking", "HIIT"],
        },
        {
          whenParentIncludes: "Mind-body or flexibility",
          options: ["Yoga", "Pilates", "Stretching", "Dance", "Tai chi"],
        },
        {
          whenParentIncludes: "Learning a skill or sport",
          options: [
            "Martial arts",
            "A team sport",
            "A racquet sport",
            "Dance form",
            "Swimming (learning)",
          ],
        },
      ],
      visibleWhen: {
        questionId: w("preferred_activities"),
        anyOf: [...CQ08_TRIGGERS_08A],
      },
      weights: {},
    },
    [w("workout_environment")]: {
      id: w("workout_environment"),
      prompt: "Where do you prefer to be active?",
      type: "single",
      options: ["At home", "At a gym or training centre", "Outdoors", "No preference"],
      weights: {},
    },
    [w("sleep_quality")]: {
      id: w("sleep_quality"),
      prompt: "How would you rate your sleep quality?",
      type: "single",
      options: ["Very poor", "Poor", "Average", "Good", "Excellent"],
      weights: {},
    },
    [w("sleep_hours")]: {
      id: w("sleep_hours"),
      prompt: "How many hours do you usually sleep?",
      type: "single",
      options: ["Under 5 hours", "5–6 hours", "6–7 hours", "7–8 hours", "Over 8 hours"],
      weights: {},
    },
    [w("caffeine_habit")]: {
      id: w("caffeine_habit"),
      prompt: "How do you usually have caffeine?",
      type: "single",
      options: [
        "I don't have caffeine",
        "Only in the morning",
        "Through the day, but not after 4 PM",
        "Through the day, including evenings",
      ],
      weights: {},
    },
    [w("food_pattern")]: {
      id: w("food_pattern"),
      prompt: "Which best describes your usual food pattern?",
      type: "single",
      options: ["Vegetarian", "Vegan", "Eggetarian", "Non-vegetarian", "No specific pattern"],
      weights: {},
    },
    [w("meal_control")]: {
      id: w("meal_control"),
      prompt: "Who usually decides what you eat?",
      type: "single",
      options: [
        "I decide and prepare most meals",
        "Someone else at home decides",
        "I mostly eat out or order in",
        "It varies",
      ],
      weights: {},
    },
    [w("wellness_goals")]: {
      id: w("wellness_goals"),
      prompt: "What matters most to you right now?",
      type: "single",
      options: [
        "Lose weight or manage body fat",
        "Build strength or muscle",
        "Have more energy and feel better",
        "Sleep better and recover well",
        "Reduce stress and feel calmer",
        "Build a consistent routine",
      ],
      weights: {},
    },
    [w("wellness_barriers")]: {
      id: w("wellness_barriers"),
      prompt: "What are the main challenges in your wellness journey?",
      caption: "Select up to 2",
      type: "multi",
      maxSelections: 2,
      options: [
        "Shortage of time",
        "Lack of consistency",
        "Lack of knowledge or clarity",
        "Stress or emotional eating",
        "Self-consciousness about exercising",
        "Physical limitation or injury",
        "Unpredictable schedule or routine",
      ],
      weights: {},
    },
    [w("support_system")]: {
      id: w("support_system"),
      prompt: "How supportive are the people around you when it comes to your wellness?",
      type: "single",
      options: ["Very supportive", "Somewhat supportive", "Neutral or mixed", "Not supportive"],
      weights: {},
    },
    [w("health_flags")]: {
      id: w("health_flags"),
      prompt: "Is there anything we should know about your health?",
      caption: "Select all that apply",
      type: "multi",
      options: [
        "No known issues",
        "A medical condition",
        "An injury",
        "Pregnancy or postpartum",
        "A doctor-advised restriction",
        "Ongoing fatigue",
        "Persistent pain",
        "Prefer not to say",
      ],
      weights: {},
    },
  };

  return {
    id: wellnessContextAssessmentId,
    title: "Wellness Context Questionnaire",
    description:
      "Help us understand your lifestyle, goals, and environment so we can tailor your wellness plan.",
    sections: [
      {
        id: "about_you",
        title: "Section A — About You",
        questionIds: [w("age_range"), w("gender"), w("work_lifestyle")],
      },
      {
        id: "routine_capacity",
        title: "Section B — Routine & Capacity",
        questionIds: [w("stress_level"), w("wellness_time")],
      },
      {
        id: "movement_fitness",
        title: "Section C — Movement & Fitness",
        questionIds: [
          w("fitness_level"),
          w("daily_activity"),
          w("preferred_activities"),
          w("preferred_activity_details"),
          w("workout_environment"),
        ],
      },
      {
        id: "sleep",
        title: "Section D — Sleep",
        questionIds: [w("sleep_quality"), w("sleep_hours"), w("caffeine_habit")],
      },
      {
        id: "nutrition",
        title: "Section E — Nutrition",
        questionIds: [w("food_pattern"), w("meal_control")],
      },
      {
        id: "goals_barriers",
        title: "Section F — Goals & Challenges",
        questionIds: [w("wellness_goals"), w("wellness_barriers")],
      },
      {
        id: "support_style",
        title: "Section G — Support",
        questionIds: [w("support_system")],
      },
      {
        id: "health_safety",
        title: "Section H — Health & Safety",
        questionIds: [w("health_flags")],
      },
    ],
    questions,
  };
}

export function isWellnessContextAnswerKey(key: string): boolean {
  return key.startsWith(WELLNESS_CONTEXT_PREFIX);
}

export function isQuestionVisible(q: AssessmentQuestion, answers: Record<string, unknown>): boolean {
  const rule = q.visibleWhen;
  if (!rule) return true;
  const raw = answers[rule.questionId];
  const selected = Array.isArray(raw) ? raw.map(String) : raw != null && raw !== "" ? [String(raw)] : [];
  return rule.anyOf.some((opt) => selected.includes(opt));
}

/** Resolve options for conditional questions (e.g. CQ08a groups). */
export function resolveQuestionOptions(q: AssessmentQuestion, answers: Record<string, unknown>): string[] {
  if (!q.optionGroups?.length || !q.visibleWhen) return q.options ?? [];
  const raw = answers[q.visibleWhen.questionId];
  const selected = Array.isArray(raw) ? raw.map(String) : raw != null && raw !== "" ? [String(raw)] : [];
  const opts = new Set<string>();
  for (const group of q.optionGroups) {
    if (selected.includes(group.whenParentIncludes)) {
      for (const o of group.options) opts.add(o);
    }
  }
  return opts.size > 0 ? [...opts] : (q.options ?? []);
}

export { buildWellnessContextQuestionnaire as getWellnessContextQuestionnaire };
