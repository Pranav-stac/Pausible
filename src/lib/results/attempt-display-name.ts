import { formatGoalsPhrase } from "@/lib/coach-guide/format-profile-context";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { personaLabel } from "@/lib/results/persona-display";
import { resolveParticipantFirstName } from "@/lib/results/resolve-participant-name";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { PersonaKey } from "@/lib/scoring/persona-types";
import type { AttemptAnswers } from "@/types/models";

function goalsFromAnswers(answers: AttemptAnswers): string[] {
  const raw = answers.wc_wellness_goals;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function primaryPersonaKey(attempt: SerializedAttempt): PersonaKey | null {
  const key =
    attempt.personaAnalysis?.primaryPersona ??
    attempt.scores?.persona?.primaryPersona ??
    attempt.scores?.archetypeKey;
  return key ? (key as PersonaKey) : null;
}

export function buildDeterministicDisplayNameFromProfile(args: {
  participantName?: string | null;
  ownerEmail?: string | null;
  answers?: AttemptAnswers;
  primaryPersona?: PersonaKey | null;
  personaTitle?: string | null;
  goals?: string[];
}): string {
  const firstName = resolveParticipantFirstName({
    participantName: args.participantName,
    ownerEmail: args.ownerEmail,
    answers: args.answers,
    fallback: "",
  });

  const personaName = args.primaryPersona
    ? (PERSONA_DISPLAY[args.primaryPersona]?.label ?? personaLabel(args.primaryPersona))
    : args.personaTitle?.trim() || null;

  const goals = args.goals?.length ? args.goals : goalsFromAnswers(args.answers ?? {});
  const goalsPhrase = formatGoalsPhrase(goals);

  const parts: string[] = [];
  if (firstName && firstName !== "Client" && firstName !== "Your profile") {
    parts.push(firstName);
  }
  if (personaName) parts.push(personaName);
  if (goalsPhrase && goalsPhrase !== "general wellness") parts.push(goalsPhrase);

  if (parts.length) return parts.join(" · ");
  return "Wellness assessment";
}

export function buildDeterministicAttemptDisplayName(attempt: SerializedAttempt): string {
  return buildDeterministicDisplayNameFromProfile({
    ownerEmail: attempt.ownerEmail,
    answers: attempt.answers,
    primaryPersona:
      attempt.actionPlanCache?.plan?.profile?.primaryPersona ?? primaryPersonaKey(attempt),
    personaTitle: attempt.personaAnalysis?.personaTitle,
    goals: attempt.actionPlanCache?.plan?.profile?.goals ?? goalsFromAnswers(attempt.answers),
  });
}

export function resolveAttemptDisplayName(attempt: SerializedAttempt): string {
  const stored = attempt.reportDisplayName?.trim();
  if (stored) return stored;

  const fromCache = attempt.actionPlanCache?.plan?.synthesis?.reportDisplayName?.trim();
  if (fromCache) return fromCache;

  return buildDeterministicAttemptDisplayName(attempt);
}

export function formatAttemptListDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function paymentStatusLabel(status: SerializedAttempt["paymentStatus"]): string {
  if (status === "paid") return "Paid";
  if (status === "failed") return "Failed";
  return "Pending";
}
