import { NextResponse } from "next/server";
import { loadPersonaScoringConfigAdmin } from "@/lib/server/persona-config";

/** Public read of centroid table + alpha for client-side scoring at submit time. */
export async function GET() {
  try {
    const config = await loadPersonaScoringConfigAdmin();
    return NextResponse.json(config);
  } catch {
    const { DEFAULT_PERSONA_CENTROIDS, DEFAULT_PERSONA_ALPHA } = await import("@/lib/scoring/persona-defaults");
    return NextResponse.json({
      centroids: DEFAULT_PERSONA_CENTROIDS,
      alpha: DEFAULT_PERSONA_ALPHA,
    });
  }
}
