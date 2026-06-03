import { getDashboardSummary } from "@/lib/dashboard-summary-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const summary = await getDashboardSummary(authResult.actor);

  return NextResponse.json(summary);
}
