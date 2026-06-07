import { confirmPayslipCsvImport } from "@/lib/payslip-import-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Only .csv files are supported." }, { status: 400 });
  }

  try {
    const csvContent = await file.text();
    const actorName = `${authResult.actor.firstName} ${authResult.actor.lastName}`.trim();
    const result = await confirmPayslipCsvImport({
      csvContent,
      fileName: file.name,
      importedById: authResult.actor.id,
      importedByName: actorName,
    });

    return NextResponse.json({
      recordsImported: result.recordsImported,
      recordsUpdated: result.recordsUpdated,
      recordsSkipped: result.recordsSkipped,
      unmatchedEmployees: result.unmatchedEmployees,
      recordsArchived: result.archived,
      auditLogId: result.auditLogId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to import payslip CSV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
