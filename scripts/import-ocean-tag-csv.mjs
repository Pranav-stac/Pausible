/**
 * Import NewData OCEAN Cay trait + category tag CSVs into src/data/ocean JSON.
 * Run: node scripts/import-ocean-tag-csv.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const traitCsv = readFileSync(join(root, "NewData/v1.0_Pausibl_OCEAN_Cay_Trait_Tags.csv"), "utf8");
const categoryCsv = readFileSync(join(root, "NewData/v1.0_Pausibl_OCEAN_Category_Trait_Tags.csv"), "utf8");

function parseRange(rangeStr) {
  const nums = rangeStr.match(/[\d.]+/g)?.map(Number) ?? [];
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: nums[0], max: nums[nums.length - 1] };
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

function parseTraitCsv(text) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  return lines.map((line) => {
    const cols = parseCsvLine(line);
    const traitCode = cols[1]?.trim().toLowerCase();
    return {
      trait: cols[0]?.trim(),
      traitCode,
      bands: [
        { ...parseRange(cols[3]), tag: cols[4]?.trim() },
        { ...parseRange(cols[6]), tag: cols[7]?.trim() },
        { ...parseRange(cols[9]), tag: cols[10]?.trim() },
      ],
      meanings: {
        low: cols[5]?.trim(),
        medium: cols[8]?.trim(),
        high: cols[11]?.trim(),
      },
    };
  });
}

function parseCategoryCsv(text) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  const byFacet = {};
  const facetOrder = [];

  for (const line of lines) {
    const cols = parseCsvLine(line);
    const categoryCode = cols[2]?.trim();
    const facetId = categoryCode
      ? categoryCode
          .split("_")
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("-")
      : "";

    // Map category codes to facet IDs used in assessment (O-NC style)
    const facetMap = {
      nutritional_curiosity: "O-NC",
      exercise_exploration: "O-EE",
      recovery_exploration: "O-RE",
      mind_body_exploration: "O-ME",
      wellness_learning_orientation: "O-WL",
      wellness_adaptability: "O-WA",
      meal_planning_discipline: "C-MP",
      workout_adherence: "C-WA",
      sleep_routine_consistency: "C-SR",
      progress_tracking: "C-PT",
      impulse_control: "C-IC",
      recovery_discipline: "C-RD",
      social_workout_preference: "E-SW",
      wellness_sharing: "E-WS",
      healthy_competition: "E-HC",
      activity_energy: "E-AE",
      group_recovery_preference: "E-GR",
      positive_wellness_influence: "E-PW",
      nutrition_consideration: "A-NC",
      wellness_harmony: "A-WH",
      supportive_encouragement: "A-SE",
      respect_for_guidance: "A-RG",
      cooperative_participation: "A-CP",
      shared_recovery_respect: "A-SR",
      health_anxiety_sensitivity: "N-HA",
      emotional_eating_response: "N-EE",
      stress_impact_on_consistency: "N-SC",
      sleep_worry_mental_overload: "N-SW",
      wellness_stability: "N-WS",
      emotional_recovery_resilience: "N-ER",
    };

    const id = facetMap[categoryCode] ?? facetId;
    facetOrder.push(id);

    byFacet[id] = {
      trait: cols[0]?.trim(),
      category: cols[1]?.trim(),
      categoryCode,
      bands: [
        { ...parseRange(cols[4]), tag: cols[5]?.trim() },
        { ...parseRange(cols[7]), tag: cols[8]?.trim() },
        { ...parseRange(cols[10]), tag: cols[11]?.trim() },
      ],
      meanings: {
        low: cols[6]?.trim(),
        medium: cols[9]?.trim(),
        high: cols[12]?.trim(),
      },
    };
  }

  return { byFacet, facetOrder: [...new Set(facetOrder)] };
}

const traitTags = parseTraitCsv(traitCsv);
const { byFacet, facetOrder } = parseCategoryCsv(categoryCsv);

writeFileSync(join(root, "src/data/ocean/trait-tag-config.json"), JSON.stringify(traitTags, null, 2));
writeFileSync(join(root, "src/data/ocean/category-tag-by-facet.json"), JSON.stringify(byFacet, null, 2));
writeFileSync(join(root, "src/data/ocean/facet-order.json"), JSON.stringify(facetOrder, null, 2));

console.log(`Wrote trait-tag-config.json (${traitTags.length} traits)`);
console.log(`Wrote category-tag-by-facet.json (${Object.keys(byFacet).length} facets)`);
