import { listInventoryImportAuditLogs } from "@/lib/inventory-import-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const logs = await listInventoryImportAuditLogs();
  return NextResponse.json({ logs });
}
