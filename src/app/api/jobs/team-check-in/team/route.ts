import {
  canAccessTeamCheckIn,
  getAttendanceTeamForActor,
  listAttendanceLocations,
} from "@/lib/attendance-log-service";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { actor } = authResult;

  if (!canAccessTeamCheckIn(actor)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const location = request.nextUrl.searchParams.get("location") ?? undefined;
    const team = await getAttendanceTeamForActor(actor, location);

    return NextResponse.json({
      team,
      locations: isManagerOrAbove(actor.accessLevel) ? listAttendanceLocations() : [],
      isManager: isManagerOrAbove(actor.accessLevel),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load attendance team.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
