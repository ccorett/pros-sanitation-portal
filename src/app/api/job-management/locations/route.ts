import { listCleaningClientLocationsForContext } from "@/lib/job-management-service";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const ctx = await toEmployeeAccessContext(authResult.actor);
  const locations = await listCleaningClientLocationsForContext(ctx);

  return NextResponse.json({ locations });
}
