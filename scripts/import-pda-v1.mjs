/**
 * Import authoritative PDA v1.0 data from FinalData Excel:
 *   - Master Recommendations v1.13 (171 recs, 21 cols)
 *   - Contextual Questions & Tags v1.3 (tag mapping)
 *
 * Usage: node scripts/import-pda-v1.mjs
 */
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const excelDir = path.join(root, "FinalData", "Excel");

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

async function importMaster() {
  const file = path.join(excelDir, "Pausibl_RecommendationsMaster_v1.13_Master Recommendations.xlsx");
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

    const effortRaw = cellStr(row.getCell(21)).toLowerCase();
    const effortLevel =
      effortRaw === "low" || effortRaw === "medium" || effortRaw === "high" ? effortRaw : "low";

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
      effortLevel,
    });
  });

  const outDir = path.join(root, "src", "data", "recommendations");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "master-rows.json"), JSON.stringify(rows, null, 2));
  console.log(`✓ master-rows.json — ${rows.length} recommendations (v1.13)`);
  return rows.length;
}

async function importTagMapping() {
  const file = path.join(
    excelDir,
    "v1.3_Pausibl_Contextual_Questions_tags_Context Tag Mapping.xlsx",
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error("Context Tag Mapping workbook empty");

  const tagRows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;
    const questionId = cellStr(row.getCell(2));
    if (!questionId.startsWith("CQ")) return;
    const tag = cellStr(row.getCell(7));
    if (!tag) return;
    tagRows.push({
      questionId,
      question: cellStr(row.getCell(3)),
      responseType: cellStr(row.getCell(4)),
      responseValue: cellStr(row.getCell(5)),
      tagCategory: cellStr(row.getCell(6)),
      tag,
    });
  });

  const outDir = path.join(root, "src", "data", "recommendations");
  writeFileSync(path.join(outDir, "tag-mapping-rules.json"), JSON.stringify(tagRows, null, 2));
  console.log(`✓ tag-mapping-rules.json — ${tagRows.length} tag rules (CQ v1.3)`);
  return tagRows.length;
}

const recCount = await importMaster();
const tagCount = await importTagMapping();
console.log(`\nDone: ${recCount} recommendations, ${tagCount} tag rules`);
