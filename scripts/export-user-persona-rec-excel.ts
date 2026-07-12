/**
 * Export report persona distribution: which ranked recommendations were selected
 * into the report, then how many of those are SE/SB/PW/CF/WD/ST/all_personas.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/export-user-persona-rec-excel.ts tp
 *   npx tsx --env-file=.env scripts/export-user-persona-rec-excel.ts [uid]
 */
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type DocumentData, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { PERSONA_KEY_TO_ALIAS } from "../src/lib/recommendations/persona-aliases";
import { PERSONA_ANIMAL } from "../src/lib/scoring/persona-defaults";
import { fitTierLabel, blendStrengthLabel } from "../src/lib/scoring/persona-fit";
import { RECOMMENDATION_CONFIG_DOC_PATH } from "../src/lib/recommendations/firestore-config-types";
import type { PersonaKey } from "../src/lib/scoring/persona-types";

const MODE_OR_UID = process.argv[2]?.trim() || "tp";
const TP_MODE = MODE_OR_UID.toLowerCase() === "tp" || MODE_OR_UID.toLowerCase() === "anonymous";
const UID = TP_MODE ? "" : MODE_OR_UID;

const TP_EMAIL_RE = /^TP_(\d+)(?:_|@|$)/i;
const TP_LOCAL_RE = /@test\.local$/i;

/** Spreadsheet column codes → CSV persona aliases used in personaFit */
const CODE_TO_ALIAS = {
  SE: "steady_elephant",
  SB: "steadfast_bear",
  PW: "pack_wolf",
  CF: "curious_fox",
  WD: "watchful_deer",
  ST: "shielded_turtle",
} as const;

type Code = keyof typeof CODE_TO_ALIAS;

const CODES = Object.keys(CODE_TO_ALIAS) as Code[];

function normalizePrivateKey(sa: Record<string, unknown>): void {
  const pk = sa.private_key;
  if (typeof pk === "string" && pk.includes("\\n")) {
    sa.private_key = pk.replace(/\\n/g, "\n");
  }
}

function parseServiceAccount(raw: string): ServiceAccount {
  const sa = JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, unknown>;
  normalizePrivateKey(sa);
  return sa as ServiceAccount;
}

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON_BASE64?.replace(/\s+/g, "") ?? "";
  if (b64) {
    return parseServiceAccount(Buffer.from(b64, "base64").toString("utf8").replace(/^\uFEFF/, ""));
  }
  const rawJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON?.trim();
  if (rawJson) return parseServiceAccount(rawJson);
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH?.trim();
  if (filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (existsSync(resolved)) return parseServiceAccount(readFileSync(resolved, "utf8"));
  }
  throw new Error("Missing Firebase Admin credentials in .env");
}

function initDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return getFirestore();
}

function createdAtMillis(data: Record<string, unknown> | DocumentData): number {
  const v = data.createdAt as { toMillis?: () => number } | null | undefined;
  if (v && typeof v.toMillis === "function") return v.toMillis();
  return 0;
}

function animalName(keyOrAlias: string | null | undefined): string {
  if (!keyOrAlias) return "";
  const raw = String(keyOrAlias);
  // already an animal display name?
  if (/\s/.test(raw) && !raw.includes("_")) return raw;
  // persona key → animal
  if (raw in PERSONA_ANIMAL) return PERSONA_ANIMAL[raw as PersonaKey].name;
  // alias → key → animal
  const entry = Object.entries(PERSONA_KEY_TO_ALIAS).find(([, a]) => a === raw);
  if (entry) return PERSONA_ANIMAL[entry[0] as PersonaKey].name;
  return raw.replace(/_/g, " ");
}

function aliasCode(keyOrAlias: string | null | undefined): string {
  if (!keyOrAlias) return "";
  const raw = String(keyOrAlias);
  if (raw in PERSONA_KEY_TO_ALIAS) {
    const alias = PERSONA_KEY_TO_ALIAS[raw as PersonaKey];
    const code = (Object.entries(CODE_TO_ALIAS).find(([, a]) => a === alias)?.[0] ?? "") as string;
    return code;
  }
  const code = (Object.entries(CODE_TO_ALIAS).find(([, a]) => a === raw)?.[0] ?? "") as string;
  return code || raw;
}

function emptyCounts(): Record<Code | "all_personas", number> {
  return { SE: 0, SB: 0, PW: 0, CF: 0, WD: 0, ST: 0, all_personas: 0 };
}

function aliasToCode(alias: string): Code | "all_personas" | null {
  const a = alias.toLowerCase().trim();
  if (a === "all_personas") return "all_personas";
  const hit = CODES.find((c) => CODE_TO_ALIAS[c] === a);
  return hit ?? null;
}

function assignExclusiveBucket(
  fits: string[],
  primaryCode: string,
  secondaryCode: string,
): Code | "all_personas" | null {
  const codes = fits
    .map((a) => aliasToCode(a))
    .filter((c): c is Code | "all_personas" => c != null);
  if (primaryCode && codes.includes(primaryCode as Code)) return primaryCode as Code;
  if (secondaryCode && codes.includes(secondaryCode as Code)) return secondaryCode as Code;
  if (codes.includes("all_personas")) return "all_personas";
  if (codes.length >= 1) return codes[0]!;
  return null;
}

function countPersonaFits(
  sourceIds: string[],
  fitById: Map<string, string[]>,
  primaryCode: string,
  secondaryCode: string,
): Record<Code | "all_personas", number> {
  const counts = emptyCounts();
  for (const id of sourceIds) {
    const normalized = (fitById.get(id) ?? []).map((f) => f.toLowerCase().trim());
    if (normalized.length === 0) continue;
    const bucket = assignExclusiveBucket(normalized, primaryCode, secondaryCode);
    if (bucket) counts[bucket] += 1;
  }
  return counts;
}

/**
 * Recommendations selected from ranking and used in the report:
 * pillar Key Actions + High-Impact opportunity cards + PI/coach notes.
 * (Excludes safety-only / unused ranked rows.)
 */
function collectSourceIds(attempt: Record<string, unknown>): string[] {
  const cache = attempt.actionPlanCache as Record<string, unknown> | undefined;
  const plan = cache?.plan as Record<string, unknown> | undefined;
  if (!plan) return [];

  const synthesis = (plan.synthesis ?? {}) as Record<string, unknown>;
  const ids = new Set<string>();
  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) if (typeof x === "string" && x.trim()) ids.add(x.trim());
  };

  // Slide 07 — Key Actions (picked from ranked list per pillar)
  const pillarPlans = (synthesis.pillarPlans ?? plan.pillarPlans) as
    | Record<string, { sourceIds?: unknown }>
    | undefined;
  if (pillarPlans && typeof pillarPlans === "object") {
    for (const p of Object.values(pillarPlans)) push(p?.sourceIds);
  }

  // Slide 08 — High-Impact Priorities (selected from ranking/clusters)
  const cards = synthesis.opportunityCards;
  if (Array.isArray(cards)) {
    for (const card of cards) {
      if (card && typeof card === "object") {
        const c = card as { id?: unknown; sourceIds?: unknown };
        push(c.sourceIds);
        if (typeof c.id === "string" && c.id.trim()) ids.add(c.id.trim());
      }
    }
  }

  // Primary-pattern PI series used in the report
  const coach = synthesis.coachNotes as { sourceIds?: unknown } | undefined;
  push(coach?.sourceIds);
  const pi = (synthesis.piSeries ?? plan.piSeries) as { sourceIds?: unknown } | undefined;
  push(pi?.sourceIds);

  if (ids.size > 0) return [...ids];

  // Last resort: full audit list
  const audit = plan.audit as { sourceIds?: string[] } | undefined;
  if (Array.isArray(audit?.sourceIds)) return [...new Set(audit.sourceIds.map(String))];
  return [];
}

function personaFromAttempt(attempt: Record<string, unknown>) {
  const scores = attempt.scores as Record<string, unknown> | undefined;
  const persona = (attempt.personaAnalysis ?? scores?.persona) as Record<string, unknown> | null;
  if (!persona) {
    return {
      personaText: "",
      primaryLabel: "",
      primaryCode: "",
      fitCategory: "",
      secondaryLabel: "",
      secondaryCode: "",
      blend: "",
    };
  }

  const primary =
    (persona.primaryPersona as string | undefined) ??
    (persona.primaryPersonaAlias as string | undefined) ??
    "";
  const secondary =
    (persona.secondaryPersona as string | undefined) ??
    (persona.secondaryPersonaAlias as string | undefined) ??
    "";
  const fitTier = String(persona.fitTier ?? "");
  const blend = String(persona.blendStrength ?? "");
  const title =
    (persona.personaTitle as string | undefined) ||
    [fitTierLabel(fitTier), animalName(primary)].filter(Boolean).join(" ");

  return {
    personaText: title,
    primaryLabel: animalName(primary),
    primaryCode: aliasCode(primary),
    fitCategory: fitTier ? fitTierLabel(fitTier) : "",
    secondaryLabel: animalName(secondary),
    secondaryCode: aliasCode(secondary),
    blend: blend ? blendStrengthLabel(blend as "pure" | "tendencies" | "strong_influence") : "",
  };
}

function userNameFromAttempt(attempt: Record<string, unknown>): string {
  const email = attempt.ownerEmail != null ? String(attempt.ownerEmail) : "";
  if (email && !email.includes("@")) return email;
  if (email) {
    const local = email.split("@")[0] || email;
    // TP_32_Teenager_16F → Teenager
    const m = local.match(/^TP_\d+_(.+?)(?:_\d+[MF])?$/i);
    if (m) return m[1].replace(/[-_]/g, " ").replace(/\bof\b/gi, "of");
    return local;
  }
  return String(attempt.uid ?? "").slice(0, 8);
}

function parseTpMeta(attempt: Record<string, unknown>): { tpNum: number; tpLabel: string; profileId: string } | null {
  const email = attempt.ownerEmail != null ? String(attempt.ownerEmail) : "";
  const local = email.includes("@") ? email.split("@")[0]! : email;
  const m = local.match(/^TP_(\d+)(?:_(.+))?$/i);
  if (!m) return null;
  const tpNum = Number(m[1]);
  const rest = m[2] ?? "";
  const nice = rest
    ? rest.replace(/_\d+[MF]$/i, "").replace(/[-_]/g, " ").trim()
    : `Profile ${tpNum}`;
  return { tpNum, tpLabel: `TP_${String(tpNum).padStart(2, "0")}`, profileId: local };
}

function isAnonymousTpAttempt(attempt: Record<string, unknown>): boolean {
  const email = attempt.ownerEmail != null ? String(attempt.ownerEmail) : "";
  if (TP_EMAIL_RE.test(email) || TP_EMAIL_RE.test(email.split("@")[0] ?? "")) return true;
  if (TP_LOCAL_RE.test(email) && /^TP_/i.test(email)) return true;
  const uid = String(attempt.uid ?? "");
  return /^mcp-test-/i.test(uid) && /^TP_/i.test(email);
}

async function main() {
  const db = initDb();

  let docs: QueryDocumentSnapshot[] = [];

  if (TP_MODE) {
    console.log("Querying anonymous TP_* test-profile attempts…");
    // Prefix range covers TP_01…TP_99 ownerEmails
    const snap = await db
      .collection("attempts")
      .where("ownerEmail", ">=", "TP_")
      .where("ownerEmail", "<", "TP`")
      .get();

    const filtered = snap.docs.filter((d) => isAnonymousTpAttempt(d.data() as Record<string, unknown>));

    // Keep latest attempt per TP profile id
    const latestByProfile = new Map<string, (typeof filtered)[number]>();
    for (const d of filtered) {
      const data = d.data() as Record<string, unknown>;
      const meta = parseTpMeta(data);
      const key = meta?.profileId ?? String(data.ownerEmail ?? d.id);
      const prev = latestByProfile.get(key);
      const t = createdAtMillis(data);
      const pt = prev ? createdAtMillis(prev.data() as Record<string, unknown>) : -1;
      if (!prev || t >= pt) latestByProfile.set(key, d);
    }

    docs = [...latestByProfile.values()].sort((a, b) => {
      const ma = parseTpMeta(a.data() as Record<string, unknown>);
      const mb = parseTpMeta(b.data() as Record<string, unknown>);
      return (ma?.tpNum ?? 999) - (mb?.tpNum ?? 999);
    });
    console.log(`Found ${filtered.length} TP attempt(s); using latest per profile → ${docs.length}`);
  } else {
    console.log(`Querying attempts for uid=${UID}…`);
    const snap = await db.collection("attempts").where("uid", "==", UID).get();
    console.log(`Found ${snap.size} attempt(s)`);
    docs = [...snap.docs].sort((a, b) => {
      const ta = createdAtMillis(a.data());
      const tb = createdAtMillis(b.data());
      return tb - ta;
    });
  }

  const recSnap = await db.doc(RECOMMENDATION_CONFIG_DOC_PATH).get();
  const recs = (recSnap.data()?.recommendations ?? []) as Array<{ id?: string; personaFit?: string[] }>;
  const fitById = new Map<string, string[]>();
  for (const r of recs) {
    if (r.id) fitById.set(r.id, (r.personaFit ?? []).map(String));
  }
  console.log(`Loaded ${fitById.size} recommendation personaFit rows`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Persona Rec Counts");

  // Row 1: group header
  ws.mergeCells("H1:M1");
  ws.getCell("H1").value = "Recommendations";
  ws.getCell("H1").alignment = { horizontal: "center" };
  ws.getCell("H1").font = { bold: true };

  // Row 2: column headers
  const headers = [
    "TP#",
    "User name",
    "Persona text",
    "Primary Persona",
    "Fit category",
    "Secondary Persona",
    "Blend",
    "SE",
    "SB",
    "PW",
    "CF",
    "WD",
    "ST",
    "all_personas",
  ];
  ws.getRow(2).values = [undefined, ...headers];
  ws.getRow(2).font = { bold: true };

  const detailWs = wb.addWorksheet("Attempt Detail");
  detailWs.addRow([
    "attemptId",
    "createdAt",
    "TP#",
    "User name",
    "personaTitle",
    "primary",
    "fit",
    "secondary",
    "blend",
    "selectedRecCount",
    "sourceIds",
    "SE_ids",
    "SB_ids",
    "PW_ids",
    "CF_ids",
    "WD_ids",
    "ST_ids",
    "all_personas_ids",
  ]);

  let rowIdx = 3;
  docs.forEach((doc, i) => {
    const data = doc.data() as Record<string, unknown>;
    const persona = personaFromAttempt(data);
    const sourceIds = collectSourceIds(data);
    const counts = countPersonaFits(sourceIds, fitById, persona.primaryCode, persona.secondaryCode);
    const tpMeta = parseTpMeta(data);
    const name = userNameFromAttempt(data);
    const tp = tpMeta?.tpLabel ?? `A${String(i + 1).padStart(2, "0")}`;
    const usedTotal =
      counts.SE + counts.SB + counts.PW + counts.CF + counts.WD + counts.ST + counts.all_personas;

    // Human-readable row (matches screenshot row style)
    ws.getRow(rowIdx).values = [
      undefined,
      tp,
      name,
      persona.personaText,
      persona.primaryLabel,
      persona.fitCategory,
      persona.secondaryLabel,
      persona.blend,
      counts.SE || "",
      counts.SB || "",
      counts.PW || "",
      counts.CF || "",
      counts.WD || "",
      counts.ST || "",
      counts.all_personas || "",
    ];
    rowIdx += 1;

    // Code row (matches screenshot second-line style: WD / Core / ST / strong influence)
    ws.getRow(rowIdx).values = [
      undefined,
      "",
      "",
      "",
      persona.primaryCode,
      persona.fitCategory,
      persona.secondaryCode,
      persona.blend.toLowerCase() === "strong influence" ? "strong influence" : persona.blend,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ];
    rowIdx += 1;

    // Detail sheet: each used rec id in exactly one persona bucket
    const byCode: Record<Code | "all_personas", string[]> = {
      SE: [],
      SB: [],
      PW: [],
      CF: [],
      WD: [],
      ST: [],
      all_personas: [],
    };
    for (const id of sourceIds) {
      const fits = (fitById.get(id) ?? []).map((f) => f.toLowerCase().trim());
      const bucket = assignExclusiveBucket(fits, persona.primaryCode, persona.secondaryCode);
      if (bucket) byCode[bucket].push(id);
    }

    const createdAt =
      data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === "function"
        ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
        : "";

    detailWs.addRow([
      doc.id,
      createdAt,
      tp,
      name,
      persona.personaText,
      persona.primaryLabel,
      persona.fitCategory,
      persona.secondaryLabel,
      persona.blend,
      usedTotal,
      sourceIds.join(", "),
      byCode.SE.join(", "),
      byCode.SB.join(", "),
      byCode.PW.join(", "),
      byCode.CF.join(", "),
      byCode.WD.join(", "),
      byCode.ST.join(", "),
      byCode.all_personas.join(", "),
    ]);
  });

  // Legend sheet
  const legend = wb.addWorksheet("Legend");
  legend.addRow(["Code", "personaFit alias", "Display name"]);
  legend.addRow(["SE", "steady_elephant", "Steady Elephant"]);
  legend.addRow(["SB", "steadfast_bear", "Steadfast Bear"]);
  legend.addRow(["PW", "pack_wolf", "Pack Wolf"]);
  legend.addRow(["CF", "curious_fox", "Curious Fox"]);
  legend.addRow(["WD", "watchful_deer", "Watchful Deer"]);
  legend.addRow(["ST", "shielded_turtle", "Shielded Turtle"]);
  legend.addRow(["all_personas", "all_personas", "Applies to all personas"]);
  legend.addRow([]);
  legend.addRow([
    "Note",
    "Only recommendations SELECTED from ranking and USED in the report (Key Actions pillars + High-Impact cards + PI/coach). Each rec counted once. Distribution = how many of those were for SE/SB/PW/CF/WD/ST/all_personas. Priority: user primary match → secondary → all_personas → first personaFit. Column sum = total used in report.",
  ]);
  legend.addRow(["mode", TP_MODE ? "anonymous_tp_profiles" : "uid"]);
  if (!TP_MODE) legend.addRow(["uid", UID]);
  legend.addRow(["attemptCount", docs.length]);

  ws.columns = headers.map((h) => ({
    width: h === "Persona text" || h === "User name" || h === "Secondary Persona" ? 22 : h.length + 4,
  }));

  const outDir = path.join(process.cwd(), "Test results");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    TP_MODE
      ? "TP_report_persona_distribution.xlsx"
      : `User_${UID.slice(0, 8)}_report_persona_distribution.xlsx`,
  );
  await wb.xlsx.writeFile(outPath);
  console.log(`Wrote ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
