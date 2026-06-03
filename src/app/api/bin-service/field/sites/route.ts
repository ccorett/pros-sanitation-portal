import { requireBinApiAccess } from "@/lib/bin-service/api-auth";
import { listBinFieldSitesForActor } from "@/lib/bin-service/field-service";
import { NextResponse } from "next/server";

export async function GET() {
  const access = await requireBinApiAccess();
  if ("error" in access) return access.error;

  const sites = await listBinFieldSitesForActor(access.employee);

  return NextResponse.json({ sites });
}
