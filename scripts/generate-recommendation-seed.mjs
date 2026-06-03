import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function split(s) {
  if (!s?.trim()) return [];
  return [...new Set(s.split(";").map((x) => x.trim()).filter(Boolean))];
}

const masterText = readFileSync(
  path.join(root, "v1.4_A11A_RecommendationStrengthValidated_Pausibl_RecommendationsMaster.csv"),
  "utf8",
);
const masterRows = parseCsvRows(masterText)
  .slice(1)
  .filter((r) => r[0]?.trim())
  .map((r) => ({
    id: r[0].trim(),
    pillar: r[1].trim(),
    category: r[2].trim(),
    type: r[3].trim().toLowerCase().replace(/\s+/g, "_"),
    text: r[4].trim(),
    personaFit: split(r[5]),
    contextFit: split(r[6]),
    goalFit: split(r[7]),
    barrierFit: split(r[8]),
    excludeIf: split(r[9]),
    strength: r[10].trim().toLowerCase(),
    notes: (r[11] || "").trim(),
  }));

const tagText = readFileSync(
  path.join(root, "v1.0_ContextQuestionnaire_TagMapping_Pausibl.csv"),
  "utf8",
);
const tagRows = parseCsvRows(tagText)
  .slice(1)
  .filter((r) => r[0]?.trim())
  .map((r) => ({
    questionId: r[0].trim(),
    question: r[1].trim(),
    responseType: r[2].trim(),
    responseValue: r[3].trim(),
    tagCategory: r[4].trim(),
    tag: r[5].trim(),
  }));

const outDir = path.join(root, "src", "data", "recommendations");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "master-rows.json"), JSON.stringify(masterRows));
writeFileSync(path.join(outDir, "tag-mapping-rules.json"), JSON.stringify(tagRows));
console.log("Wrote", masterRows.length, "recommendations and", tagRows.length, "tag rules");
