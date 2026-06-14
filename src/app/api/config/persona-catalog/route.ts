import { NextResponse } from "next/server";
import { buildDefaultPersonaCatalog } from "@/lib/admin/platform-config-defaults";
import { loadPersonaCatalogAdmin } from "@/lib/server/platform-config";

export async function GET() {
  try {
    const catalog = await loadPersonaCatalogAdmin();
    return NextResponse.json(catalog);
  } catch {
    return NextResponse.json(buildDefaultPersonaCatalog());
  }
}
