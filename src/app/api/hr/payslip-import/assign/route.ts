import { assignSkippedPayslip } from "@/lib/payslip-recovery-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const body = (await request.json()) as {
    payslipId?: string;
    employeeId?: string;
  };

  if (!body.payslipId?.trim() || !body.employeeId?.trim()) {
    return NextResponse.json(
      { error: "Payslip ID and employee ID are required." },
      { status: 400 },
    );
  }

  try {
    const payslip = await assignSkippedPayslip(body.payslipId.trim(), body.employeeId.trim());
    return NextResponse.json({ payslip });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to assign skipped payslip.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
