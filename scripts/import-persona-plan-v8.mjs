/**
 * Import OCEAN questionnaire from FINALFINAL/Persona Plan_v8.xlsx → question.json + ocean seeds.
 *
 * Usage: node scripts/import-persona-plan-v8.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const v8Path = path.join(root, "FINALFINAL", "Persona Plan_v8.xlsx");
const tagPath = path.join(root, "FINALFINAL", "v1.1_Pausibl_OCEAN_Category_Trait_Tags.xlsx");

const TRAIT_FROM_CODE = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

function parseScoreRange(raw) {
  const m = String(raw ?? "").match(/([\d.]+)\s*[–-]\s*([\d.]+)/);
  if (!m) return null;
  return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
}

function importQuestionnaire() {
  const wb = XLSX.readFile(v8Path);
  const sheet = wb.Sheets.Questionnaire;
  if (!sheet) throw new Error("Questionnaire sheet not found in Persona Plan_v8.xlsx");

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const questions = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = String(r[2] ?? "").trim();
    if (!code) continue;
    const facetName = String(r[1] ?? "").trim();
    const facetId = code.replace(/-\d+$/, "");
    const letter = facetId[0];
    questions.push({
      id: code,
      code,
      trait: TRAIT_FROM_CODE[letter] ?? facetName,
      facet: facetName,
      facetId,
      text: String(r[3] ?? "").trim(),
      is_reverse: String(r[4] ?? "").trim().toLowerCase() === "reverse",
      order_index: questions.length,
      is_active: true,
    });
  }

  if (questions.length !== 90) {
    throw new Error(`Expected 90 questions, got ${questions.length}`);
  }

  writeFileSync(path.join(root, "question.json"), JSON.stringify(questions, null, 2));

  const facetOrder = [];
  const seen = new Set();
  for (const q of questions) {
    if (!seen.has(q.facetId)) {
      seen.add(q.facetId);
      facetOrder.push(q.facetId);
    }
  }

  return { questions, facetOrder };
}

function importOceanTags(facetNamesInUse) {
  const wb = XLSX.readFile(tagPath);
  const sheet = wb.Sheets["Category Tags"];
  if (!sheet) throw new Error("Category Tags sheet not found in v1.1 OCEAN tags");

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const categoryByName = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const category = String(r[1] ?? "").trim();
    if (!category) continue;
    categoryByName.set(category, {
      trait: String(r[0] ?? "").trim(),
      category,
      categoryCode: String(r[2] ?? "").trim(),
      bands: [
        { ...parseScoreRange(r[4]), tag: String(r[5] ?? "").trim() },
        { ...parseScoreRange(r[7]), tag: String(r[8] ?? "").trim() },
        { ...parseScoreRange(r[10]), tag: String(r[11] ?? "").trim() },
      ].filter((b) => b.min != null && b.tag),
    });
  }

  const traitSheet = wb.Sheets["Trait Tags"];
  const traitRows = XLSX.utils.sheet_to_json(traitSheet, { header: 1, defval: "" });
  const traitTagConfig = [];
  for (let i = 1; i < traitRows.length; i++) {
    const r = traitRows[i];
    if (!String(r[0] ?? "").trim()) continue;
    traitTagConfig.push({
      trait: String(r[0]).trim(),
      traitCode: String(r[1] ?? "").trim().toLowerCase(),
      bands: [
        { ...parseScoreRange(r[3]), tag: String(r[4] ?? "").trim() },
        { ...parseScoreRange(r[6]), tag: String(r[7] ?? "").trim() },
        { ...parseScoreRange(r[9]), tag: String(r[10] ?? "").trim() },
      ].filter((b) => b.min != null && b.tag),
    });
  }

  const categoryTagByFacetId = {};
  const missing = [];
  for (const q of facetNamesInUse) {
    if (categoryTagByFacetId[q.facetId]) continue;
    const cfg = categoryByName.get(q.facet);
    if (cfg) categoryTagByFacetId[q.facetId] = cfg;
    else missing.push(`${q.facetId} (${q.facet})`);
  }

  if (missing.length) {
    console.warn("Warning: no category tag config for facets:", missing.join(", "));
  }

  return { traitTagConfig, categoryTagByFacetId };
}

const { questions, facetOrder } = importQuestionnaire();
const { traitTagConfig, categoryTagByFacetId } = importOceanTags(questions);

const outDir = path.join(root, "src", "data", "ocean");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "facet-order.json"), JSON.stringify(facetOrder, null, 2));
writeFileSync(path.join(outDir, "trait-tag-config.json"), JSON.stringify(traitTagConfig, null, 2));
writeFileSync(path.join(outDir, "category-tag-by-facet.json"), JSON.stringify(categoryTagByFacetId, null, 2));

console.log(`Imported Persona Plan v8: ${questions.length} questions, ${facetOrder.length} facets`);
console.log("Sample Q70-72:");
for (const q of questions.filter((x) => /^A-RP-/.test(x.code))) {
  console.log(`  ${q.code}: ${q.text.slice(0, 90)}…`);
}
