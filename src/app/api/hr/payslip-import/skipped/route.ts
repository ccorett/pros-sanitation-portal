import { listSkippedPayslips } from "@/lib/payslip-recovery-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const skipped = await listSkippedPayslips();
  return NextResponse.json({ skipped });
}
