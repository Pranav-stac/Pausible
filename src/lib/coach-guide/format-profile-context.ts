export function formatGoalTag(goal: string): string {
  return goal.replace(/^goal_/, "").replace(/_/g, " ");
}

export function formatGoalTags(goals: string[]): string[] {
  return goals.map(formatGoalTag).filter(Boolean);
}

/** Natural-language list: "fat loss", "fat loss and energy", "a, b, and c". */
export function formatGoalsPhrase(goals: string[]): string {
  const tags = formatGoalTags(goals);
  if (!tags.length) return "general wellness";
  if (tags.length === 1) return tags[0]!;
  if (tags.length === 2) return `${tags[0]} and ${tags[1]}`;
  return `${tags.slice(0, -1).join(", ")}, and ${tags[tags.length - 1]}`;
}

export function formatBarrierTag(barrier: string): string {
  return barrier.replace(/^barrier_/, "").replace(/_/g, " ");
}

export function formatBarrier(barriers: string[]): string {
  if (!barriers.length) return "Not specified";
  return formatBarrierTag(barriers[0]!);
}
