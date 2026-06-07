import { autoRecoverSkippedPayslips } from "@/lib/payslip-recovery-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const result = await autoRecoverSkippedPayslips();
    return NextResponse.json({ result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to recover skipped payslips.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
