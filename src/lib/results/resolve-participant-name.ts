import type { AttemptAnswers } from "@/types/models";

function firstToken(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name.trim();
}

/** Full display name for report cover / footer. */
export function resolveParticipantName(args: {
  participantName?: string | null;
  ownerEmail?: string | null;
  answers?: AttemptAnswers | null;
  fallback?: string;
}): string {
  const fallback = args.fallback ?? "Your profile";
  const fromExplicit = args.participantName?.trim();
  if (fromExplicit) return fromExplicit;

  const answers = args.answers ?? {};
  for (const key of ["participant_display_name", "participant_name", "display_name", "full_name", "name"]) {
    const raw = answers[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }

  const email = args.ownerEmail?.trim();
  if (email?.includes("@")) {
    const local = email.split("@")[0]?.replace(/[._+-]+/g, " ").trim();
    if (local) {
      return local
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return fallback;
}

/** Coach guide intro / motivators — first name only when possible. */
export function resolveParticipantFirstName(args: Parameters<typeof resolveParticipantName>[0]): string {
  const full = resolveParticipantName({ ...args, fallback: "Client" });
  if (full === "Client" || full === "Your profile") return full;
  return firstToken(full);
}
