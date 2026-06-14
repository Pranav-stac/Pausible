import { getAdminFirestore } from "@/lib/firebase/server";
import {
  DEFAULT_REPORT_TEMPLATES,
  DEFAULT_SCORING_CONFIG,
  mergePersonaCatalog,
  mergeReportTemplates,
  mergeScoringConfig,
  buildDefaultPersonaCatalog,
} from "@/lib/admin/platform-config-defaults";
import {
  PERSONA_CATALOG_DOC,
  REPORT_TEMPLATES_DOC,
  SCORING_CONFIG_DOC,
  type PersonaCatalogDoc,
  type ReportTemplatesDoc,
  type ScoringConfigDoc,
} from "@/lib/admin/platform-config-types";

export async function loadScoringConfigAdmin(): Promise<ScoringConfigDoc> {
  const db = getAdminFirestore();
  if (!db) return DEFAULT_SCORING_CONFIG;
  const snap = await db.doc(SCORING_CONFIG_DOC).get();
  return mergeScoringConfig(snap.exists ? (snap.data() as ScoringConfigDoc) : null);
}

export async function loadPersonaCatalogAdmin(): Promise<PersonaCatalogDoc> {
  const db = getAdminFirestore();
  if (!db) return buildDefaultPersonaCatalog();
  const snap = await db.doc(PERSONA_CATALOG_DOC).get();
  return mergePersonaCatalog(snap.exists ? (snap.data() as PersonaCatalogDoc) : null);
}

export async function loadReportTemplatesAdmin(): Promise<ReportTemplatesDoc> {
  const db = getAdminFirestore();
  if (!db) return DEFAULT_REPORT_TEMPLATES;
  const snap = await db.doc(REPORT_TEMPLATES_DOC).get();
  return mergeReportTemplates(snap.exists ? (snap.data() as ReportTemplatesDoc) : null);
}
