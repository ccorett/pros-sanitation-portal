import {
  canAccessTeamCheckIn,
  updateAttendanceLog,
} from "@/lib/attendance-log-service";
import { AttendanceStatus } from "@prisma/client";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = new Set<string>(Object.values(AttendanceStatus));

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { actor } = authResult;

  if (!canAccessTeamCheckIn(actor)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    notes?: string;
    checkInTime?: string | null;
  };

  if (body.status && !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
  }

  try {
    const log = await updateAttendanceLog(actor, id, {
      status: body.status as AttendanceStatus | undefined,
      notes: body.notes,
      checkInTime: body.checkInTime,
    });

    return NextResponse.json({ log });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update attendance record.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
