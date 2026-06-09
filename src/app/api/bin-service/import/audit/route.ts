import { listBinLocationImportAuditLogs } from "@/lib/bin-location-import-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const logs = await listBinLocationImportAuditLogs();
  return NextResponse.json({ logs });
}
