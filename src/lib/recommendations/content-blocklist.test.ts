import { describe, expect, it } from "vitest";
import { containsBlocklistTerm, scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";

describe("scrubBlocklistTerms", () => {
  it("replaces push through from Steadfast Bear persona context", () => {
    const raw = "You push through fatigue, but that approach has a ceiling.";
    const scrubbed = scrubBlocklistTerms(raw);
    expect(scrubbed).toBe("You work through fatigue, but that approach has a ceiling.");
    expect(containsBlocklistTerm(scrubbed)).toBeNull();
  });

  it("handles do not push through before shorter phrase", () => {
    const raw = "Do not push through sharp pain.";
    const scrubbed = scrubBlocklistTerms(raw);
    expect(scrubbed.toLowerCase()).not.toContain("push through");
  });

  it("scrubs scored and score phrasing without leaving blocklist hits", () => {
    const raw =
      "This pillar scored highly for your profile (cluster 72). Your total score suggests a strong fit.";
    const scrubbed = scrubBlocklistTerms(raw);
    expect(scrubbed.toLowerCase()).not.toContain("scored");
    expect(scrubbed.toLowerCase()).not.toContain("cluster");
    expect(containsBlocklistTerm(scrubbed)).toBeNull();
  });
});
