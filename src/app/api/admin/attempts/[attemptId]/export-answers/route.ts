import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getDefaultAssessment } from "@/data/default-assessment";
import {
  getWellnessContextQuestionnaire,
  wellnessContextAssessmentId,
} from "@/data/wellness-context-questionnaire";
import {
  buildAttemptAnswerBlocks,
  buildOrphanAnswerRows,
  countAnsweredRows,
} from "@/lib/admin/format-attempt-answer";
import { requireAdmin } from "@/lib/api/admin-auth";
import {
  firebaseAdminErrorHint,
  isFirebaseAdminUnauthenticatedError,
} from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";
import type { AssessmentDefinition } from "@/types/models";

function serializeValue(v: unknown): string {
  if (v && typeof v === "object") {
    const o = v as { toDate?: () => Date };
    if (typeof o.toDate === "function") {
      try {
        return o.toDate().toISOString();
      } catch {
        return "";
      }
    }
  }
  if (v == null) return "";
  return String(v);
}

function asAssessmentDefinition(raw: unknown, fallback: AssessmentDefinition): AssessmentDefinition {
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Partial<AssessmentDefinition>;
  if (!o.id || !o.questions || !o.sections) return fallback;
  return {
    ...fallback,
    ...o,
    id: String(o.id),
    title: String(o.title ?? fallback.title),
    questions: o.questions as AssessmentDefinition["questions"],
    sections: o.sections as AssessmentDefinition["sections"],
  };
}

function sheetNameForBlock(title: string, id: string, used: Set<string>): string {
  const base = (title || id || "Sheet")
    .replace(/[\\/*?:\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 28);
  let name = base || "Sheet";
  let n = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ attemptId: string }> }) {
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.response;

  const { attemptId } = await ctx.params;
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: "Server misconfigured", hint: firebaseAdminErrorHint() },
      { status: 503 },
    );
  }

  let snap;
  try {
    snap = await db.collection("attempts").doc(attemptId).get();
  } catch (e) {
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return NextResponse.json(
        { error: "Firebase Admin credentials rejected", hint: firebaseAdminErrorHint() },
        { status: 503 },
      );
    }
    throw e;
  }
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = snap.data() ?? {};
  const answers =
    typeof data.answers === "object" && data.answers
      ? (data.answers as Record<string, unknown>)
      : {};
  const oceanAssessmentId = String(data.assessmentId ?? "default") || "default";

  let oceanRaw: unknown = null;
  let wellnessRaw: unknown = null;
  try {
    const [oceanSnap, wellnessSnap] = await Promise.all([
      db.collection("assessments").doc(oceanAssessmentId).get(),
      db.collection("assessments").doc(wellnessContextAssessmentId).get(),
    ]);
    oceanRaw = oceanSnap.exists ? oceanSnap.data() : null;
    wellnessRaw = wellnessSnap.exists ? wellnessSnap.data() : null;
  } catch (e) {
    if (isFirebaseAdminUnauthenticatedError(e)) {
      return NextResponse.json(
        { error: "Firebase Admin credentials rejected", hint: firebaseAdminErrorHint() },
        { status: 503 },
      );
    }
    throw e;
  }

  const oceanDef = asAssessmentDefinition(oceanRaw, getDefaultAssessment());
  const wellnessDef = asAssessmentDefinition(wellnessRaw, getWellnessContextQuestionnaire());
  const assessments = [oceanDef, wellnessDef];
  const blocks = buildAttemptAnswerBlocks(assessments, answers);
  const orphanRows = buildOrphanAnswerRows(assessments, answers);
  const counts = countAnsweredRows(blocks);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pausible Admin";
  workbook.created = new Date();

  const meta = workbook.addWorksheet("Meta");
  meta.columns = [
    { header: "Field", key: "field", width: 24 },
    { header: "Value", key: "value", width: 56 },
  ];
  for (const row of [
    { field: "attemptId", value: snap.id },
    { field: "uid", value: String(data.uid ?? "") },
    { field: "assessmentId", value: oceanAssessmentId },
    { field: "ownerType", value: String(data.ownerType ?? "") },
    { field: "ownerEmail", value: String(data.ownerEmail ?? "") },
    { field: "paymentStatus", value: String(data.paymentStatus ?? "") },
    { field: "createdAt", value: serializeValue(data.createdAt) },
    { field: "answeredCount", value: String(counts.answered) },
    { field: "totalQuestions", value: String(counts.total) },
    { field: "orphanAnswerKeys", value: String(orphanRows.length) },
  ]) {
    meta.addRow(row);
  }

  const usedNames = new Set<string>(["meta"]);
  const answerColumns = [
    { header: "Section", key: "section", width: 28 },
    { header: "Question #", key: "questionNumber", width: 12 },
    { header: "Question ID", key: "questionId", width: 22 },
    { header: "Prompt", key: "prompt", width: 56 },
    { header: "Caption", key: "caption", width: 28 },
    { header: "Type", key: "type", width: 12 },
    { header: "Answer", key: "answer", width: 40 },
    { header: "Detail", key: "detail", width: 28 },
    { header: "Answered", key: "answered", width: 10 },
  ];

  for (const block of blocks) {
    const sheet = workbook.addWorksheet(sheetNameForBlock(block.assessmentTitle, block.assessmentId, usedNames));
    sheet.columns = answerColumns;
    let qn = 0;
    for (const section of block.sections) {
      for (const row of section.rows) {
        qn += 1;
        sheet.addRow({
          section: section.title,
          questionNumber: qn,
          questionId: row.questionId,
          prompt: row.prompt,
          caption: row.caption ?? "",
          type: row.type,
          answer: row.display,
          detail: row.detail ?? "",
          answered: row.answered ? "yes" : "no",
        });
      }
    }
    sheet.getRow(1).font = { bold: true };
  }

  if (orphanRows.length) {
    const orphans = workbook.addWorksheet(sheetNameForBlock("Unmapped answers", "orphans", usedNames));
    orphans.columns = [
      { header: "Question ID", key: "questionId", width: 28 },
      { header: "Answer", key: "answer", width: 56 },
    ];
    for (const row of orphanRows) {
      orphans.addRow({ questionId: row.questionId, answer: row.display });
    }
    orphans.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `pausible-answers-${snap.id}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
