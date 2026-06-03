import { listPoliciesForEmployee } from "@/lib/policy-service";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const policies = await listPoliciesForEmployee(authResult.actor.id);

  return NextResponse.json({ policies });
}
