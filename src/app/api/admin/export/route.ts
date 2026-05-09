import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/api/admin-auth";
import { firebaseAdminErrorHint, isFirebaseAdminUnauthenticatedError } from "@/lib/firebase/admin-firestore-errors";
import { getAdminFirestore } from "@/lib/firebase/server";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const workbook = new ExcelJS.Workbook();
  const attemptsSheet = workbook.addWorksheet("attempts");

  attemptsSheet.columns = [
    { header: "attemptId", key: "attemptId", width: 36 },
    { header: "uid", key: "uid", width: 28 },
    { header: "assessmentId", key: "assessmentId", width: 16 },
    { header: "paymentStatus", key: "paymentStatus", width: 12 },
    { header: "paymentProvider", key: "paymentProvider", width: 14 },
    { header: "paymentId", key: "paymentId", width: 28 },
    { header: "shareEligible", key: "shareEligible", width: 10 },
    { header: "shareToken", key: "shareToken", width: 16 },
    { header: "createdAt", key: "createdAt", width: 24 },
    { header: "paidAt", key: "paidAt", width: 24 },
  ];

  const db = getAdminFirestore();
  if (db) {
    try {
      const snap = await db.collection("attempts").orderBy("createdAt", "desc").limit(5000).get();
      snap.docs.forEach((d) => {
        const x = d.data();
        attemptsSheet.addRow({
          attemptId: d.id,
          uid: String(x.uid ?? ""),
          assessmentId: String(x.assessmentId ?? ""),
          paymentStatus: String(x.paymentStatus ?? ""),
          paymentProvider: String(x.paymentProvider ?? ""),
          paymentId: String(x.paymentId ?? ""),
          shareEligible: Boolean(x.isLatestShareEligible) ? "yes" : "no",
          shareToken: String(x.shareToken ?? "").slice(0, 12),
          createdAt: x.createdAt?.toDate?.()?.toISOString?.() ?? "",
          paidAt: x.paidAt?.toDate?.()?.toISOString?.() ?? "",
        });
      });
    } catch (e) {
      if (isFirebaseAdminUnauthenticatedError(e)) {
        return NextResponse.json({ error: "Firebase Admin credentials rejected", hint: firebaseAdminErrorHint() }, { status: 503 });
      }
      throw e;
    }
  } else {
    attemptsSheet.addRow({
      attemptId: "demo",
      uid: "configure-firebase-admin",
      assessmentId: "default",
      paymentStatus: "n/a",
      paymentProvider: "n/a",
      paymentId: "n/a",
      shareEligible: "no",
      shareToken: "",
      createdAt: new Date().toISOString(),
      paidAt: "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pausible-export.xlsx"',
    },
  });
}
