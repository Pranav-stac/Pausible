import type { Timestamp } from "firebase/firestore";

/** Builder-driven question types */
export type QuestionType = "likert" | "single" | "multi";

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  /** Secondary line under the prompt (e.g. facet · item code) */
  caption?: string;
  type: QuestionType;
  /** Likert: inclusive endpoints (defaults 1..5) */
  scaleMin?: number;
  scaleMax?: number;
  /** Likert: invert raw score relative to endpoints before normalization */
  reverse?: boolean;
  /** Likert: optional per-point labels */
  options?: string[];
  /** Scoring: dimension key and weight per option index (single/multi) or per score (likert uses value as score) */
  weights: Record<string, number>;
};

export type AssessmentSection = {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
};

export type AssessmentDefinition = {
  id: string;
  title: string;
  description?: string;
  /** Admins deactivate without deleting */
  active?: boolean;
  sections: AssessmentSection[];
  questions: Record<string, AssessmentQuestion>;
  /** Human-readable bands keyed by dimension avg thresholds */
  interpretation?: {
    archetypes: {
      key: string;
      label: string;
      minScore: number;
      /** inclusive upper; omitted = infinity */
      maxScore?: number;
      summary: string;
      bullets: string[];
    }[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type AttemptAnswers = Record<string, number | string | string[]>;

export type AttemptScores = {
  dimensions: Record<string, number>;
  archetypeKey?: string;
};

export type AttemptDoc = {
  uid: string;
  ownerType?: "anonymous" | "google" | "local";
  ownerEmail?: string | null;
  assessmentId: string;
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
  paymentStatus: "pending" | "paid" | "failed";
  paymentProvider?: "stripe" | "razorpay" | "paypal" | "dev" | "free";
  paymentId?: string;
  shareToken?: string | null;
  /** Private history — never expose via share route */
  isLatestShareEligible?: boolean;
  claimedAt?: Timestamp;
  createdAt?: Timestamp;
  paidAt?: Timestamp;
};

export type UserDoc = {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous?: boolean;
  referralCode?: string | null;
  referredBy?: string | null;
  referralCount?: number;
};

/** Global ops flags — doc id `global` under `app_settings` */
export type AppSettingsDoc = {
  /** When false, completions skip checkout and unlock results immediately */
  requirePayment?: boolean;
  /** Integer INR charged at checkout; unset uses `NEXT_PUBLIC_ASSESSMENT_PRICE_INR` */
  priceInr?: number;
  updatedAt?: Timestamp;
};

export type DiscountCampaign = {
  code: string;
  /** 0–100 */
  percentOff: number;
  active: boolean;
  maxRedemptions?: number;
  redemptionCount?: number;
  validUntil?: Timestamp | null;
};
