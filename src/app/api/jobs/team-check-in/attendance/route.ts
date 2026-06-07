import {
  canAccessTeamCheckIn,
  listAttendanceLogsForActor,
  submitAttendanceLogs,
} from "@/lib/attendance-log-service";
import { AttendanceStatus } from "@prisma/client";
import { requirePortalStaffActor } from "@/lib/require-portal-staff-api";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = new Set<string>(Object.values(AttendanceStatus));

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
    const logs = await listAttendanceLogsForActor(actor, { location });
    return NextResponse.json({ logs });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load attendance logs.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePortalStaffActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { actor } = authResult;

  if (!canAccessTeamCheckIn(actor)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    attendanceDate?: string;
    location?: string;
    entries?: Array<{
      employeeId?: string;
      status?: string;
      notes?: string;
      checkInTime?: string;
    }>;
  };

  if (!body.attendanceDate?.trim()) {
    return NextResponse.json({ error: "Attendance date is required." }, { status: 400 });
  }

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: "Attendance entries are required." }, { status: 400 });
  }

  const entries = body.entries.map((entry) => {
    if (!entry.employeeId?.trim() || !entry.status?.trim()) {
      throw new Error("Each entry requires employeeId and status.");
    }

    if (!VALID_STATUSES.has(entry.status)) {
      throw new Error(`Invalid attendance status: ${entry.status}`);
    }

    return {
      employeeId: entry.employeeId.trim(),
      status: entry.status as AttendanceStatus,
      notes: entry.notes,
      checkInTime: entry.checkInTime,
    };
  });

  try {
    const result = await submitAttendanceLogs(actor, {
      attendanceDate: body.attendanceDate.trim(),
      location: body.location?.trim(),
      entries,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to submit attendance.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
