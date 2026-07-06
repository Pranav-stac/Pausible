import { describe, expect, it } from "vitest";
import {
  ageBandTagFromYears,
  computeAgeYearsFromDate,
  parseIsoDate,
  resolveWellnessAge,
} from "@/lib/recommendations/compute-wellness-age";

describe("compute-wellness-age", () => {
  it("parses ISO dates", () => {
    expect(parseIsoDate("1990-06-15")).not.toBeNull();
    expect(parseIsoDate("bad")).toBeNull();
  });

  it("derives elderly only from exact DOB at 65+", () => {
    const info = resolveWellnessAge({ wc_date_of_birth: "1955-01-01" }, []);
    expect(info.isElderly65).toBe(true);
    expect(info.computedAgeYears).toBeGreaterThanOrEqual(65);
  });

  it("55+ band alone does not trigger elderly rules", () => {
    const info = resolveWellnessAge({}, ["age_55_plus"]);
    expect(info.isElderly65).toBe(false);
    expect(info.computedAgeYears).toBe(62);
  });

  it("maps years to age bands", () => {
    expect(ageBandTagFromYears(16)).toBe("age_under_18");
    expect(ageBandTagFromYears(30)).toBe("age_25_34");
    expect(computeAgeYearsFromDate(parseIsoDate("2000-01-01")!, new Date("2020-06-01T12:00:00.000Z"))).toBe(20);
  });
});
