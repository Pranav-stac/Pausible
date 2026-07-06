import type { AssessmentDefinition } from "@/types/models";

/** Prefix for wellness-context answer keys (stored alongside OCEAN item codes on the attempt). */
export const WELLNESS_CONTEXT_PREFIX = "wc_";

export const wellnessContextAssessmentId = "wellness-context";

/**
 * Wellness Context Questionnaire v1.4 — 20 questions (CQ01–CQ20), 8 sections.
 * @see FinalData/NewFinalData/Pausibl_Contextual_Questions_tags_v1.4.xlsx
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
      prompt: "Which best describe your current work and lifestyle?",
      caption: "Select all that apply",
      type: "multi",
      options: [
        "Desk-based (office / remote / hybrid)",
        "Shift-based",
        "Physically demanding",
        "Travel-heavy",
        "Homemaker or caregiver",
        "Student",
        "Not currently working",
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
      prompt: "How much time can you realistically give most days?",
      type: "single",
      options: ["Under 15 min", "15–30 min", "30–45 min", "45+ min"],
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
        "Train with a structured program",
      ],
      weights: {},
    },
    [w("daily_activity")]: {
      id: w("daily_activity"),
      prompt: "Your usual daily activity level?",
      type: "single",
      options: ["Sedentary", "Lightly active", "Moderately active", "Very active"],
      weights: {},
    },
    [w("preferred_activities")]: {
      id: w("preferred_activities"),
      prompt: "What kinds of physical activity do you enjoy or prefer?",
      caption: "Select all that apply",
      type: "multi",
      options: [
        "Walking",
        "Running / jogging",
        "Strength or weights",
        "Cardio / HIIT",
        "Yoga, Pilates or stretching",
        "Sports or games",
        "Dancing",
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
      options: ["At home", "At a gym or training centre", "Outdoors", "No preference"],
      weights: {},
    },
    [w("time_of_day")]: {
      id: w("time_of_day"),
      prompt: "When do you prefer to be active?",
      type: "single",
      options: ["Early morning", "Daytime", "Evening", "Late night", "No fixed preference"],
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
      prompt: "Your caffeine habit?",
      type: "single",
      options: ["None", "Morning only", "Through the day", "Evening too"],
      weights: {},
    },
    [w("food_pattern")]: {
      id: w("food_pattern"),
      prompt: "Which best describes your usual food pattern?",
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
      prompt: "How much control do you have over your meals?",
      type: "single",
      options: [
        "I cook most of my meals",
        "Someone else prepares most (home or cafeteria)",
        "I mostly eat out or order in",
        "Mixed / varies by day",
      ],
      weights: {},
    },
    [w("wellness_goals")]: {
      id: w("wellness_goals"),
      prompt: "What are your main wellness goals?",
      caption: "Select up to 3",
      type: "multi",
      maxSelections: 3,
      options: [
        "Fat loss / weight management",
        "Build muscle / get stronger",
        "More energy through the day",
        "Better sleep",
        "Less stress / mental calm",
        "Flexibility / mobility",
        "Build a consistent routine",
        "Get back into fitness after a break",
        "Better recovery",
        "Overall health",
        "Body confidence / appearance",
      ],
      weights: {},
    },
    [w("wellness_barriers")]: {
      id: w("wellness_barriers"),
      prompt: "What usually stops you from staying consistent?",
      caption: "Select up to 3",
      type: "multi",
      maxSelections: 3,
      options: [
        "Lack of time",
        "Hard to get started",
        "Hard to stay consistent",
        "Low motivation",
        "Emotional eating or cravings",
        "Gym anxiety / self-consciousness",
        "I don't know what to do",
        "Plans feel too complex / overwhelming",
        "Travel or schedule disruption",
        "Family / caregiving responsibilities",
        "Injury or physical discomfort",
      ],
      weights: {},
    },
    [w("support_system")]: {
      id: w("support_system"),
      prompt: "How supportive is your environment for your wellness goals?",
      type: "single",
      options: ["Very supportive", "Somewhat supportive", "Neutral or mixed", "Unsupportive"],
      weights: {},
    },
    [w("solo_vs_social")]: {
      id: w("solo_vs_social"),
      prompt: "Do you prefer to pursue wellness mostly on your own or with others?",
      type: "single",
      options: ["Mostly on my own", "A mix", "Mostly with others or a group"],
      weights: {},
    },
    [w("health_flags")]: {
      id: w("health_flags"),
      prompt:
        "Any health, injury, pregnancy/postpartum, or doctor-advised restrictions? (and current symptoms)",
      caption: "Select all that apply",
      type: "multi",
      options: [
        "No known restriction",
        "Medical condition",
        "Injury",
        "Pregnancy or postpartum",
        "Doctor-advised restriction",
        "Prefer not to say",
        "Severe fatigue (symptom)",
        "Persistent pain (symptom)",
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
