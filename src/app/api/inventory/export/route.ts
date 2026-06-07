import { buildInventoryExportCsv } from "@/lib/inventory-export-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const csv = await buildInventoryExportCsv();
  const fileName = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
