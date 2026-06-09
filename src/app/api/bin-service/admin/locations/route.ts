import { listAdminBinLocationRows } from "@/lib/admin-bin-locations-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const rows = await listAdminBinLocationRows();
  return NextResponse.json({ rows });
}
