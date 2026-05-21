import type { AssessmentDefinition } from "@/types/models";

/** Prefix for wellness-context answer keys (stored alongside OCEAN item codes on the attempt). */
export const WELLNESS_CONTEXT_PREFIX = "wc_";

export const wellnessContextAssessmentId = "wellness-context";

/**
 * Wellness Context Questionnaire — 7 sections, 17 questions.
 * Shown after the personality inventory; answers merge into the attempt before scoring.
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
      prompt: "Which best describes your current work/lifestyle setup?",
      type: "single",
      options: [
        "Desk-based / office work",
        "Hybrid work",
        "Remote work",
        "Shift-based work",
        "Physically demanding work",
        "Travel-heavy work",
        "Homemaker / caregiving responsibilities",
        "Student",
        "Currently not working",
      ],
      weights: {},
    },
    [w("stress_level")]: {
      id: w("stress_level"),
      prompt: "How mentally stressful is your current work/lifestyle situation?",
      type: "likert",
      scaleMin: 1,
      scaleMax: 7,
      scaleMinLabel: "Very low stress",
      scaleMaxLabel: "Extremely stressful",
      weights: {},
    },
    [w("wellness_time")]: {
      id: w("wellness_time"),
      prompt: "On most days, how much time can you realistically dedicate to wellness activities?",
      type: "single",
      options: [
        "Less than 10 minutes",
        "10–20 minutes",
        "20–30 minutes",
        "30–45 minutes",
        "45–60 minutes",
        "More than 60 minutes",
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
        "Mostly sedentary — Sitting for most of the day with little movement (under 4,000 steps/day)",
        "Lightly active — Some movement during the day (4,000–7,000 steps/day)",
        "Moderately active — Regular movement and occasional exercise (7,000–10,000 steps/day or 2–4 workouts/week)",
        "Very active — Frequent movement or regular training (10,000+ steps/day or 5+ workouts/week)",
      ],
      weights: {},
    },
    [w("sleep_quality")]: {
      id: w("sleep_quality"),
      prompt: "How would you rate your current sleep quality?",
      type: "single",
      options: [
        "Very poor — Frequently interrupted sleep or waking exhausted",
        "Poor — Sleep is inconsistent and often leaves you tired",
        "Average — Sleep is manageable but not consistently refreshing",
        "Good — Most nights feel restful with decent recovery",
        "Excellent — Consistently deep, restful sleep with strong recovery",
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
    [w("wellness_goals")]: {
      id: w("wellness_goals"),
      prompt: "What are your primary wellness goals?",
      caption: "Select up to 2",
      type: "multi",
      maxSelections: 2,
      options: [
        "Fat loss",
        "Muscle gain",
        "Improve strength",
        "Better energy levels",
        "Improve sleep",
        "Reduce stress",
        "Improve flexibility/mobility",
        "Build consistency and discipline",
        "Improve overall health",
        "Improve confidence/appearance",
        "Return to fitness after a long break",
      ],
      weights: {},
    },
    [w("biggest_barrier")]: {
      id: w("biggest_barrier"),
      prompt: "What is your biggest barrier when it comes to wellness and fitness?",
      type: "single",
      options: [
        "Lack of time",
        "Lack of consistency",
        "Work stress",
        "Poor sleep",
        "Low motivation",
        "Emotional eating / cravings",
        "Gym anxiety",
        "Lack of knowledge",
        "Travel and schedule disruptions",
        "Family responsibilities",
        "Injury or physical discomfort",
      ],
      weights: {},
    },
    [w("workout_environment")]: {
      id: w("workout_environment"),
      prompt: "Which workout environment do you feel most comfortable in?",
      type: "single",
      options: [
        "At home",
        "Gym",
        "Outdoors",
        "Group classes",
        "With a personal trainer",
        "No preference",
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
        "Religious/cultural dietary restrictions",
      ],
      weights: {},
    },
    [w("meal_control")]: {
      id: w("meal_control"),
      prompt: "How much control do you have over your daily meals?",
      type: "single",
      options: [
        "I prepare most of my meals",
        "Someone else prepares most of my meals",
        "I frequently eat outside / order food",
        "Mixed / depends on the day",
        "I mostly rely on office/cafeteria food",
      ],
      weights: {},
    },
    [w("support_system")]: {
      id: w("support_system"),
      prompt: "What kind of support system do you currently have for your wellness journey?",
      type: "single",
      options: [
        "Strong support from friends/family",
        "Some support",
        "Neutral environment",
        "Unsupportive environment",
        "I prefer doing things on my own",
      ],
      weights: {},
    },
    [w("health_restrictions")]: {
      id: w("health_restrictions"),
      prompt:
        "Do you currently have any injury, medical condition, pregnancy/postpartum consideration, or doctor-advised restriction that may affect exercise or nutrition?",
      type: "single",
      options: ["No", "Yes", "Prefer not to say"],
      weights: {},
    },
    [w("six_month_progress")]: {
      id: w("six_month_progress"),
      prompt: "What would feel like meaningful progress for you over the next 6 months?",
      caption: "Select up to 3",
      type: "multi",
      maxSelections: 3,
      options: [
        "Feeling healthier and more energetic",
        "Becoming more consistent with exercise",
        "Sleeping better and recovering well",
        "Losing body fat / weight",
        "Feeling stronger and fitter",
        "Feeling mentally calmer and less stressed",
        "Building sustainable routines",
        "Feeling more confident in my body again",
      ],
      weights: {},
    },
  };

  return {
    id: wellnessContextAssessmentId,
    title: "Wellness Context Questionnaire",
    description:
      "Help us understand your lifestyle, goals, and environment so we can tailor your wellness persona.",
    sections: [
      {
        id: "basic",
        title: "Section 1 — Basic Information",
        questionIds: [w("age_range"), w("gender")],
      },
      {
        id: "lifestyle",
        title: "Section 2 — Lifestyle & Work Context",
        questionIds: [w("work_lifestyle"), w("stress_level"), w("wellness_time")],
      },
      {
        id: "wellness_reality",
        title: "Section 3 — Current Wellness Reality",
        questionIds: [
          w("fitness_level"),
          w("daily_activity"),
          w("sleep_quality"),
          w("sleep_hours"),
        ],
      },
      {
        id: "goals_barriers",
        title: "Section 4 — Goals & Barriers",
        questionIds: [w("wellness_goals"), w("biggest_barrier")],
      },
      {
        id: "preferences",
        title: "Section 5 — Preferences & Environment",
        questionIds: [
          w("workout_environment"),
          w("food_pattern"),
          w("meal_control"),
          w("support_system"),
        ],
      },
      {
        id: "safety",
        title: "Section 6 — Safety & Health",
        questionIds: [w("health_restrictions")],
      },
      {
        id: "outcome",
        title: "Section 7 — Future Outcome Vision",
        questionIds: [w("six_month_progress")],
      },
    ],
    questions,
  };
}

export function isWellnessContextAnswerKey(key: string): boolean {
  return key.startsWith(WELLNESS_CONTEXT_PREFIX);
}

/** Bundled default — synced to Firestore via Admin → “Sync wellness context”. */
export { buildWellnessContextQuestionnaire as getWellnessContextQuestionnaire };
