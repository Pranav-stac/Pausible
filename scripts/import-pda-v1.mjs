/**
 * Import authoritative PDA data from FINALFINAL:
 *   - Recommendation Master v1.20 (201 recs, 24 cols A–X)
 *   - Contextual Questions & Tags v1.5 (tag mapping)
 *
 * Usage: node scripts/import-pda-v1.mjs
 */
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const finalDir = path.join(root, "FINALFINAL");

function cellStr(cell) {
  const v = cell?.value;
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "result" in v) return String(v.result ?? "");
  if (typeof v === "object" && v !== null && "richText" in v) {
    return v.richText.map((r) => r.text).join("");
  }
  return String(v).trim();
}

function cellNum(cell) {
  const v = cell?.value;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = cellStr(cell);
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function splitTags(raw) {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(";").map((s) => s.trim()).filter(Boolean))];
}

/** Col U Effort Level → 1–5 integer (PDA §11 / A4). Legacy low/medium/high still accepted. */
function parseEffortLevel(cell) {
  const n = cellNum(cell);
  if (Number.isInteger(n) && n >= 1 && n <= 5) return n;
  const raw = cellStr(cell).toLowerCase();
  if (raw === "low") return 2;
  if (raw === "medium") return 3;
  if (raw === "high") return 4;
  return 3;
}

async function importMaster() {
  const file = path.join(finalDir, "v1.20_Pausibl_RecommendationsMaster.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.getWorksheet("Master Recommendations") ?? wb.worksheets[0];

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
      oceanCategoryTags: splitTags(cellStr(row.getCell(12))),
      notes: cellStr(row.getCell(13)),
      personaContext,
      oceanTraitTags: splitTags(cellStr(row.getCell(20))),
      effortLevel: parseEffortLevel(row.getCell(21)),
      scopeClassification: cellStr(row.getCell(22)).toLowerCase().replace(/\s+/g, "_"),
      userFacingBoundary: cellStr(row.getCell(23)).toLowerCase().replace(/\s+/g, "_"),
      recommendationRole: cellStr(row.getCell(24)).toLowerCase().replace(/\s+/g, "_") || "standard",
    });
  });

  const outDir = path.join(root, "src", "data", "recommendations");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "master-rows.json"), JSON.stringify(rows, null, 2));
  console.log(`✓ master-rows.json — ${rows.length} recommendations (v1.20)`);
  return rows.length;
}

async function importTagMapping() {
  const file = path.join(finalDir, "Pausibl_Contextual_Questions_tags_v1.5.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.getWorksheet("Context Tag Mapping") ?? wb.worksheets[0];
  if (!sheet) throw new Error("Context Tag Mapping workbook empty");

  const tagRows = [];
  let last = { questionId: "", question: "", responseType: "", tagCategory: "" };
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const questionId = cellStr(row.getCell(2)) || last.questionId;
    const question = cellStr(row.getCell(3)) || last.question;
    const responseType = cellStr(row.getCell(4)) || last.responseType;
    const responseValue = cellStr(row.getCell(5));
    const tagCategory = cellStr(row.getCell(6)) || last.tagCategory;
    const tag = cellStr(row.getCell(7));
    if (questionId.startsWith("CQ")) {
      last = { questionId, question, responseType, tagCategory };
    }
    if (!questionId.startsWith("CQ") || !tag || !responseValue) return;
    tagRows.push({
      questionId,
      question,
      responseType,
      responseValue,
      tagCategory,
      tag,
    });
  });

  const outDir = path.join(root, "src", "data", "recommendations");
  writeFileSync(path.join(outDir, "tag-mapping-rules.json"), JSON.stringify(tagRows, null, 2));
  console.log(`✓ tag-mapping-rules.json — ${tagRows.length} tag rules (CQ v1.5)`);
  return tagRows.length;
}

const recCount = await importMaster();
const tagCount = await importTagMapping();
console.log(`\nDone: ${recCount} recommendations, ${tagCount} tag rules`);
