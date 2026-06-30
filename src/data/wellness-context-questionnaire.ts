import type { AssessmentDefinition } from "@/types/models";

/** Prefix for wellness-context answer keys (stored alongside OCEAN item codes on the attempt). */
export const WELLNESS_CONTEXT_PREFIX = "wc_";

export const wellnessContextAssessmentId = "wellness-context";

/**
 * Wellness Context Questionnaire v1.3 — 20 questions (CQ01–CQ20), 8 sections.
 * @see PDA §10
 */
export function buildWellnessContextQuestionnaire(): AssessmentDefinition {
  const w = (id: string) => `${WELLNESS_CONTEXT_PREFIX}${id}`;

  const questions: AssessmentDefinition["questions"] = {
    [w("age_range")]: {
      id: w("age_range"),
      prompt: "What is your age range?",
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
      prompt: "Which best describes your current work and lifestyle? (select all that apply)",
      type: "multi",
      options: [
        "Desk-based / office work",
        "Shift-based work",
        "Physically demanding work",
        "Travel-heavy work",
        "Caregiving responsibilities",
        "Student",
        "Currently not working",
      ],
      weights: {},
    },
    [w("stress_level")]: {
      id: w("stress_level"),
      prompt: "How would you describe your current stress level?",
      type: "single",
      options: ["Low", "Moderate", "High"],
      weights: {},
    },
    [w("wellness_time")]: {
      id: w("wellness_time"),
      prompt: "On most days, how much time can you realistically dedicate to wellness?",
      type: "single",
      options: [
        "Under 15 minutes",
        "15–30 minutes",
        "30–45 minutes",
        "45+ minutes",
      ],
      weights: {},
    },
    [w("fitness_level")]: {
      id: w("fitness_level"),
      prompt: "Which best describes your current fitness level?",
      type: "single",
      options: [
        "Beginner — I rarely exercise",
        "Restarting — I used to exercise but stopped",
        "Intermediate — I exercise occasionally",
        "Consistent — I train regularly",
        "Advanced — I follow structured fitness programs",
      ],
      weights: {},
    },
    [w("daily_activity")]: {
      id: w("daily_activity"),
      prompt: "How physically active are you in your daily life?",
      type: "single",
      options: [
        "Mostly sedentary",
        "Lightly active",
        "Moderately active",
        "Very active",
      ],
      weights: {},
    },
    [w("preferred_activities")]: {
      id: w("preferred_activities"),
      prompt: "Which types of physical activity do you enjoy or prefer? (select all that apply)",
      type: "multi",
      options: [
        "Walking",
        "Running",
        "Strength / resistance training",
        "Cardio machines",
        "Yoga / mind-body",
        "Sports",
        "Dance",
        "Swimming",
        "Cycling",
        "Home follow-along workouts",
        "Open to anything",
      ],
      weights: {},
    },
    [w("workout_environment")]: {
      id: w("workout_environment"),
      prompt: "Where do you prefer to be active?",
      type: "single",
      options: ["At home", "Gym", "Outdoors", "No preference"],
      weights: {},
    },
    [w("time_of_day")]: {
      id: w("time_of_day"),
      prompt: "When do you prefer to do wellness activities?",
      type: "single",
      options: ["Morning", "Daytime", "Evening", "Late night", "No preference"],
      weights: {},
    },
    [w("sleep_quality")]: {
      id: w("sleep_quality"),
      prompt: "How would you rate your current sleep quality?",
      type: "single",
      options: [
        "Very poor",
        "Poor",
        "Average",
        "Good",
        "Excellent",
      ],
      weights: {},
    },
    [w("sleep_hours")]: {
      id: w("sleep_hours"),
      prompt: "On average, how many hours do you sleep per night?",
      type: "single",
      options: ["Less than 5 hours", "5–6 hours", "6–7 hours", "7–8 hours", "More than 8 hours"],
      weights: {},
    },
    [w("caffeine_habit")]: {
      id: w("caffeine_habit"),
      prompt: "How would you describe your caffeine habit?",
      type: "single",
      options: [
        "None / rarely",
        "Morning only",
        "Throughout the day",
        "Evening or late day",
      ],
      weights: {},
    },
    [w("food_pattern")]: {
      id: w("food_pattern"),
      prompt: "Which best describes your food pattern?",
      type: "single",
      options: [
        "Vegetarian",
        "Vegan",
        "Eggetarian",
        "Non-vegetarian",
        "Pescatarian",
        "No specific preference",
      ],
      weights: {},
    },
    [w("meal_control")]: {
      id: w("meal_control"),
      prompt: "How much control do you have over your daily meals?",
      type: "single",
      options: [
        "I prepare most of my meals",
        "Prepared by others",
        "Frequent eating out",
        "Mixed",
      ],
      weights: {},
    },
    [w("wellness_goals")]: {
      id: w("wellness_goals"),
      prompt: "What are your primary wellness goals?",
      caption: "Select up to 3",
      type: "multi",
      maxSelections: 3,
      options: [
        "Build muscle / get stronger",
        "Fat loss",
        "Better energy levels",
        "Less stress / mental calm",
        "Build a consistent routine",
        "Improve sleep",
        "Improve flexibility / mobility",
        "Improve overall health",
        "Better recovery",
        "Sustainable routines",
        "Return to fitness after a break",
      ],
      weights: {},
    },
    [w("wellness_barriers")]: {
      id: w("wellness_barriers"),
      prompt: "What are your biggest barriers to wellness? (select up to 3)",
      caption: "Select up to 3",
      type: "multi",
      maxSelections: 3,
      options: [
        "Hard to get started",
        "Lack of consistency",
        "Work stress",
        "Poor sleep",
        "Low motivation",
        "Emotional eating / cravings",
        "Gym anxiety",
        "Lack of knowledge",
        "Travel / schedule disruptions",
        "Family responsibilities",
        "Injury or physical discomfort",
        "Overwhelm from complexity",
      ],
      weights: {},
    },
    [w("support_system")]: {
      id: w("support_system"),
      prompt: "What kind of support do you have for your wellness journey?",
      type: "single",
      options: [
        "Strong support",
        "Some support",
        "Neutral",
        "Unsupportive environment",
      ],
      weights: {},
    },
    [w("solo_vs_social")]: {
      id: w("solo_vs_social"),
      prompt: "Do you prefer solo or social wellness activities?",
      type: "single",
      options: [
        "I prefer self-directed activities",
        "A balance of solo and social",
        "I prefer social / group activities",
      ],
      weights: {},
    },
    [w("health_flags")]: {
      id: w("health_flags"),
      prompt:
        "Do any of the following apply to you? (select all that apply)",
      type: "multi",
      options: [
        "None of these apply",
        "Medical condition affecting activity or nutrition",
        "Injury",
        "Pregnancy or postpartum",
        "Doctor-advised restriction",
        "Prefer not to say",
        "Severe fatigue",
        "Persistent pain",
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
        questionIds: [w("age_range"), w("gender")],
      },
      {
        id: "routine_capacity",
        title: "Section B — Routine & Capacity",
        questionIds: [w("work_lifestyle"), w("stress_level"), w("wellness_time")],
      },
      {
        id: "movement_fitness",
        title: "Section C — Movement & Fitness",
        questionIds: [
          w("fitness_level"),
          w("daily_activity"),
          w("preferred_activities"),
          w("workout_environment"),
          w("time_of_day"),
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
        title: "Section F — Goals & Barriers",
        questionIds: [w("wellness_goals"), w("wellness_barriers")],
      },
      {
        id: "support_style",
        title: "Section G — Support & Style",
        questionIds: [w("support_system"), w("solo_vs_social")],
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

export { buildWellnessContextQuestionnaire as getWellnessContextQuestionnaire };
