export type DualSectionPart = { title: string; body: string };

export type DualSection = {
  left: DualSectionPart;
  right: DualSectionPart;
};

/** Split combined AI body into two template columns (pattern | goals, works | advantage). */
export function splitDualSection(
  combinedBody: string,
  leftTitle: string,
  rightTitle: string,
  fallbackHeading?: string,
): DualSection {
  const trimmed = combinedBody.trim();
  if (!trimmed) {
    return {
      left: { title: fallbackHeading || leftTitle, body: "" },
      right: { title: rightTitle, body: "" },
    };
  }

  const parts = trimmed.split(/\n\n+/).filter(Boolean);
  if (parts.length >= 2) {
    const mid = Math.ceil(parts.length / 2);
    return {
      left: { title: leftTitle, body: parts.slice(0, mid).join("\n\n") },
      right: { title: rightTitle, body: parts.slice(mid).join("\n\n") },
    };
  }

  return {
    left: { title: fallbackHeading || leftTitle, body: trimmed },
    right: { title: rightTitle, body: "" },
  };
}
