import { syncPayslipsFromGoogleSheet } from "@/lib/payslip-sync-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const result = await syncPayslipsFromGoogleSheet();

    return NextResponse.json({
      recordsImported: result.imported,
      recordsUpdated: result.updated,
      employeesNotMatched: result.unmatched,
      recordsArchived: result.archived,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to sync payslips from Google Sheet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
