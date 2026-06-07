import { searchEmployeesForRecovery } from "@/lib/payslip-recovery-service";
import { requireManagerApiActor } from "@/lib/require-manager-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireManagerApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  const employees = await searchEmployeesForRecovery(query);
  return NextResponse.json({ employees });
}
