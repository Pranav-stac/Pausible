/**
 * One-time import: client v7 Excel → project JSON seeds.
 * Place files in `client-data/` (not committed):
 *   - Persona Plan_v7.xlsx
 *   - v1.7_Pausibl_RecommendationsMaster.xlsx
 * Day-to-day seeding uses committed JSON via `npm run seed:firestore`.
 */
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(root, "client-data");

const TRAIT_FROM_CODE = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

function cellStr(cell) {
  const v = cell?.value;
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "result" in v) return String(v.result ?? "");
  if (typeof v === "object" && v !== null && "richText" in v) {
    return v.richText.map((r) => r.text).join("");
  }
  return String(v).trim();
}

function splitTags(raw) {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(";").map((s) => s.trim()).filter(Boolean))];
}

async function importQuestionnaire() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(clientDir, "Persona Plan_v7.xlsx"));
  const sheet = wb.getWorksheet("Questionnaire");
  if (!sheet) throw new Error("Questionnaire sheet not found");

  const questions = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const code = cellStr(row.getCell(3));
    if (!code) return;
    const facetName = cellStr(row.getCell(2));
    const facetId = code.replace(/-\d+$/, "");
    const letter = facetId[0];
    questions.push({
      id: code,
      code,
      trait: TRAIT_FROM_CODE[letter] ?? facetName,
      facet: facetName,
      facetId,
      text: cellStr(row.getCell(4)),
      is_reverse: cellStr(row.getCell(5)).toLowerCase() === "reverse",
      order_index: questions.length,
      is_active: true,
    });
  });

  writeFileSync(path.join(root, "question.json"), JSON.stringify(questions, null, 2));

  const facetOrder = [];
  const seen = new Set();
  for (const q of questions) {
    if (!seen.has(q.facetId)) {
      seen.add(q.facetId);
      facetOrder.push(q.facetId);
    }
  }

  const outDir = path.join(root, "src", "data", "ocean");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "facet-order.json"), JSON.stringify(facetOrder, null, 2));

  console.log(`Imported ${questions.length} questions, ${facetOrder.length} facets`);
  return questions.length;
}

async function importRecommendations() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(clientDir, "v1.7_Pausibl_RecommendationsMaster.xlsx"));
  const sheet = wb.getWorksheet("Master Recommendations");
  if (!sheet) throw new Error("Master Recommendations sheet not found");

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = cellStr(row.getCell(1));
    if (!id) return;

    const personaContext = {};
    const ctxMap = [
      ["shielded_turtle", 14],
      ["curious_fox", 15],
      ["watchful_deer", 16],
      ["steadfast_bear", 17],
      ["steady_elephant", 18],
      ["pack_wolf", 19],
    ];
    for (const [alias, col] of ctxMap) {
      const text = cellStr(row.getCell(col));
      if (text) personaContext[alias] = text;
    }

    rows.push({
      id,
      pillar: cellStr(row.getCell(2)),
      category: cellStr(row.getCell(3)),
      type: cellStr(row.getCell(4)).toLowerCase().replace(/\s+/g, "_"),
      text: cellStr(row.getCell(5)),
      personaFit: splitTags(cellStr(row.getCell(6))),
      contextFit: splitTags(cellStr(row.getCell(7))),
      goalFit: splitTags(cellStr(row.getCell(8))),
      barrierFit: splitTags(cellStr(row.getCell(9))),
      excludeIf: splitTags(cellStr(row.getCell(10))),
      strength: cellStr(row.getCell(11)).toLowerCase(),
      oceanFit: splitTags(cellStr(row.getCell(12))),
      notes: cellStr(row.getCell(13)),
      personaContext,
    });
  });

  const outDir = path.join(root, "src", "data", "recommendations");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "master-rows.json"), JSON.stringify(rows, null, 2));
  console.log(`Imported ${rows.length} recommendations (v1.7)`);
  return rows.length;
}

const qCount = await importQuestionnaire();
const rCount = await importRecommendations();
console.log(`Done: ${qCount} questions, ${rCount} recommendations`);
