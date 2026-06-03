import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const revised = path.join(root, "Revised");

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(field);
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function parseScoreRange(raw) {
  const m = raw.match(/([\d.]+)\s*[–-]\s*([\d.]+)/);
  if (!m) return null;
  return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
}

const TRAIT_FROM_CODE = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

// --- Questionnaire → question.json ---
const qRows = parseCsvRows(
  readFileSync(path.join(revised, "Persona Plan_v5_Questionnaire.csv"), "utf8"),
);
const [, ...qData] = qRows;
const questions = qData
  .filter((r) => r[2]?.trim())
  .map((r, idx) => {
    const code = r[2].trim();
    const facetId = code.replace(/-\d+$/, "");
    const letter = facetId[0];
    return {
      id: code,
      code,
      trait: TRAIT_FROM_CODE[letter] ?? r[1]?.trim() ?? "Openness",
      facet: r[1]?.trim() ?? "",
      facetId,
      text: r[3]?.trim() ?? "",
      is_reverse: (r[4]?.trim() ?? "").toLowerCase() === "reverse",
      order_index: idx,
      is_active: true,
    };
  });

writeFileSync(path.join(root, "question.json"), JSON.stringify(questions, null, 2));

// --- Facet order (v5) ---
const facetOrder = [];
const seenFacet = new Set();
for (const q of questions) {
  if (!seenFacet.has(q.facetId)) {
    seenFacet.add(q.facetId);
    facetOrder.push(q.facetId);
  }
}

// --- Trait tags ---
const traitRows = parseCsvRows(
  readFileSync(path.join(revised, "v1.0_Pausibl_OCEAN_Category_Trait_Tags_Trait Tags.csv"), "utf8"),
);
const [, ...traitData] = traitRows;
const traitTagConfig = traitData
  .filter((r) => r[0]?.trim())
  .map((r) => ({
    trait: r[0].trim(),
    traitCode: r[1].trim().toLowerCase(),
    bands: [
      { ...parseScoreRange(r[3]), tag: r[4].trim() },
      { ...parseScoreRange(r[6]), tag: r[7].trim() },
      { ...parseScoreRange(r[9]), tag: r[10].trim() },
    ].filter((b) => b.min != null && b.tag),
  }));

// --- Category tags ---
const catRows = parseCsvRows(
  readFileSync(path.join(revised, "v1.0_Pausibl_OCEAN_Category_Trait_Tags_Category Tags.csv"), "utf8"),
);
const [, ...catData] = catRows;
const categoryByName = new Map();
for (const r of catData) {
  if (!r[1]?.trim()) continue;
  categoryByName.set(r[1].trim(), {
    trait: r[0].trim(),
    category: r[1].trim(),
    categoryCode: r[2].trim(),
    bands: [
      { ...parseScoreRange(r[4]), tag: r[5].trim() },
      { ...parseScoreRange(r[7]), tag: r[8].trim() },
      { ...parseScoreRange(r[10]), tag: r[11].trim() },
    ].filter((b) => b.min != null && b.tag),
  });
}

const categoryTagByFacetId = {};
for (const q of questions) {
  if (categoryTagByFacetId[q.facetId]) continue;
  const cfg = categoryByName.get(q.facet);
  if (cfg) categoryTagByFacetId[q.facetId] = cfg;
}

import { mkdirSync } from "node:fs";

const outDir = path.join(root, "src", "data", "ocean");
mkdirSync(outDir, { recursive: true });

writeFileSync(
  path.join(outDir, "facet-order.json"),
  JSON.stringify(facetOrder),
);
writeFileSync(
  path.join(outDir, "trait-tag-config.json"),
  JSON.stringify(traitTagConfig),
);
writeFileSync(
  path.join(outDir, "category-tag-by-facet.json"),
  JSON.stringify(categoryTagByFacetId),
);

console.log("Wrote", questions.length, "questions,", facetOrder.length, "facets");
