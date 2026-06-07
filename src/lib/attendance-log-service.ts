import {
  AccessLevel,
  AttendanceStatus,
  OperationalGroup,
  type Employee,
} from "@prisma/client";
import { ACTIVE_EMPLOYEE_FILTER } from "@/lib/account-retention";
import { EMPLOYEE_LOCATION_ASSIGNMENTS } from "@/lib/employee-signup-options";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";
import {
  canSupervisorReviewEmployeeVacation,
  getSupervisorVisibleEmployeeIds,
  isFloatingUnassignedLocation,
} from "@/lib/supervisor-team-scope";

export type AttendanceTeamMemberDto = {
  id: string;
  employeePublicId: string;
  fullName: string;
  locationAssignment: string | null;
};

export type AttendanceLogDto = {
  id: string;
  attendanceDate: string;
  location: string;
  supervisorId: string;
  supervisorName: string;
  employeeId: string;
  employeeName: string;
  status: AttendanceStatus;
  statusLabel: string;
  checkInTime: string | null;
  notes: string | null;
  createdAt: string;
  canEdit: boolean;
};

export type SubmitAttendanceEntry = {
  employeeId: string;
  status: AttendanceStatus;
  notes?: string;
  checkInTime?: string;
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  SICK: "Sick",
  VACATION: "Vacation",
};

function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function parseAttendanceDate(value: string): Date {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Attendance date must use YYYY-MM-DD format.");
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function formatAttendanceDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isSameAttendanceDay(date: Date, reference = new Date()): boolean {
  return formatAttendanceDate(date) === formatAttendanceDate(reference);
}

export function canAccessTeamCheckIn(actor: Pick<Employee, "accessLevel">): boolean {
  return actor.accessLevel === AccessLevel.SUPERVISOR || isManagerOrAbove(actor.accessLevel);
}

export function canEditAttendanceLog(
  actor: Employee,
  log: { attendanceDate: Date },
): boolean {
  if (isManagerOrAbove(actor.accessLevel)) {
    return true;
  }

  if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    return isSameAttendanceDay(log.attendanceDate);
  }

  return false;
}

function resolveSupervisorLocation(actor: Employee): string {
  if (
    actor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR ||
    actor.locationAssignment === "Bin Management Route"
  ) {
    return "Bin Management Route";
  }

  if (actor.locationAssignment && !isFloatingUnassignedLocation(actor.locationAssignment)) {
    return actor.locationAssignment;
  }

  throw new Error("Supervisor location is not configured.");
}

export function listAttendanceLocations(): string[] {
  return EMPLOYEE_LOCATION_ASSIGNMENTS.filter(
    (location) => location !== "Floating/Unassigned",
  );
}

async function listTeamMembersForLocation(
  location: string,
  actor: Employee,
): Promise<AttendanceTeamMemberDto[]> {
  if (location === "Bin Management Route") {
    const technicians = await prisma.employee.findMany({
      where: {
        ...ACTIVE_EMPLOYEE_FILTER,
        operationalGroup: OperationalGroup.BIN_TECHNICIAN,
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        locationAssignment: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return technicians.map((employee) => ({
      id: employee.id,
      employeePublicId: employee.employeeId,
      fullName: employeeDisplayName(employee),
      locationAssignment: employee.locationAssignment,
    }));
  }

  const rows = await prisma.employee.findMany({
    where: {
      ...ACTIVE_EMPLOYEE_FILTER,
      locationAssignment: location,
      operationalGroup: { not: OperationalGroup.BIN_TECHNICIAN },
      accessLevel: AccessLevel.TEAM_MEMBER,
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      locationAssignment: true,
      operationalGroup: true,
      accessLevel: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    return rows
      .filter((employee) => canSupervisorReviewEmployeeVacation(actor, employee))
      .map((employee) => ({
        id: employee.id,
        employeePublicId: employee.employeeId,
        fullName: employeeDisplayName(employee),
        locationAssignment: employee.locationAssignment,
      }));
  }

  return rows.map((employee) => ({
    id: employee.id,
    employeePublicId: employee.employeeId,
    fullName: employeeDisplayName(employee),
    locationAssignment: employee.locationAssignment,
  }));
}

export async function getAttendanceTeamForActor(
  actor: Employee,
  location?: string,
): Promise<{ location: string; members: AttendanceTeamMemberDto[] }> {
  if (!canAccessTeamCheckIn(actor)) {
    throw new Error("You do not have permission to access team check-in.");
  }

  if (isManagerOrAbove(actor.accessLevel) && !location?.trim()) {
    return { location: "", members: [] };
  }

  const resolvedLocation =
    actor.accessLevel === AccessLevel.SUPERVISOR
      ? resolveSupervisorLocation(actor)
      : location?.trim();

  if (!resolvedLocation) {
    throw new Error("Location is required.");
  }

  const members = await listTeamMembersForLocation(resolvedLocation, actor);

  return {
    location: resolvedLocation,
    members,
  };
}

function buildAttendanceVisibilityWhere(actor: Employee) {
  if (isManagerOrAbove(actor.accessLevel)) {
    return {};
  }

  if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    const location = resolveSupervisorLocation(actor);
    return { location };
  }

  return { id: "none" };
}

function serializeAttendanceLog(
  row: {
    id: string;
    attendanceDate: Date;
    location: string;
    supervisorId: string;
    employeeId: string;
    status: AttendanceStatus;
    checkInTime: Date | null;
    notes: string | null;
    createdAt: Date;
    supervisor: Pick<Employee, "firstName" | "lastName">;
    employee: Pick<Employee, "firstName" | "lastName">;
  },
  actor: Employee,
): AttendanceLogDto {
  return {
    id: row.id,
    attendanceDate: formatAttendanceDate(row.attendanceDate),
    location: row.location,
    supervisorId: row.supervisorId,
    supervisorName: employeeDisplayName(row.supervisor),
    employeeId: row.employeeId,
    employeeName: employeeDisplayName(row.employee),
    status: row.status,
    statusLabel: STATUS_LABELS[row.status],
    checkInTime: row.checkInTime?.toISOString() ?? null,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    canEdit: canEditAttendanceLog(actor, row),
  };
}

export async function listAttendanceLogsForActor(
  actor: Employee,
  options?: { location?: string; limit?: number },
): Promise<AttendanceLogDto[]> {
  if (!canAccessTeamCheckIn(actor)) {
    throw new Error("You do not have permission to view attendance logs.");
  }

  const visibility = buildAttendanceVisibilityWhere(actor);
  const locationFilter =
    isManagerOrAbove(actor.accessLevel) && options?.location?.trim()
      ? { location: options.location.trim() }
      : {};

  const rows = await prisma.attendanceLog.findMany({
    where: {
      ...visibility,
      ...locationFilter,
    },
    include: {
      supervisor: { select: { firstName: true, lastName: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ attendanceDate: "desc" }, { createdAt: "desc" }],
    take: options?.limit ?? 200,
  });

  return rows.map((row) => serializeAttendanceLog(row, actor));
}

function defaultCheckInTime(status: AttendanceStatus): Date | null {
  if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) {
    return new Date();
  }

  return null;
}

async function assertEmployeeInAttendanceScope(
  actor: Employee,
  employeeId: string,
  location: string,
): Promise<void> {
  const team = await getAttendanceTeamForActor(
    actor,
    actor.accessLevel === AccessLevel.SUPERVISOR ? undefined : location,
  );

  if (!team.members.some((member) => member.id === employeeId)) {
    throw new Error("Employee is not assigned to this location team.");
  }

  if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    const visibleIds = await getSupervisorVisibleEmployeeIds(actor);
    if (!visibleIds.includes(employeeId)) {
      throw new Error("You do not have permission to record attendance for this employee.");
    }
  }
}

export async function submitAttendanceLogs(
  actor: Employee,
  input: {
    attendanceDate: string;
    location?: string;
    entries: SubmitAttendanceEntry[];
  },
): Promise<{ saved: number }> {
  if (!canAccessTeamCheckIn(actor)) {
    throw new Error("You do not have permission to submit attendance.");
  }

  if (input.entries.length === 0) {
    throw new Error("At least one attendance entry is required.");
  }

  const attendanceDate = parseAttendanceDate(input.attendanceDate);
  const location =
    actor.accessLevel === AccessLevel.SUPERVISOR
      ? resolveSupervisorLocation(actor)
      : input.location?.trim();

  if (!location) {
    throw new Error("Location is required.");
  }

  if (
    actor.accessLevel === AccessLevel.SUPERVISOR &&
    !isSameAttendanceDay(attendanceDate)
  ) {
    throw new Error("Supervisors can only submit attendance for today.");
  }

  let saved = 0;

  for (const entry of input.entries) {
    await assertEmployeeInAttendanceScope(actor, entry.employeeId, location);

    const checkInTime = entry.checkInTime
      ? new Date(entry.checkInTime)
      : defaultCheckInTime(entry.status);

    await prisma.attendanceLog.upsert({
      where: {
        attendanceDate_employeeId_location: {
          attendanceDate,
          employeeId: entry.employeeId,
          location,
        },
      },
      create: {
        attendanceDate,
        location,
        supervisorId: actor.id,
        employeeId: entry.employeeId,
        status: entry.status,
        checkInTime,
        notes: entry.notes?.trim() || null,
      },
      update: {
        supervisorId: actor.id,
        status: entry.status,
        checkInTime,
        notes: entry.notes?.trim() || null,
      },
    });

    saved += 1;
  }

  return { saved };
}

export async function updateAttendanceLog(
  actor: Employee,
  attendanceLogId: string,
  input: {
    status?: AttendanceStatus;
    notes?: string;
    checkInTime?: string | null;
  },
): Promise<AttendanceLogDto> {
  const existing = await prisma.attendanceLog.findUnique({
    where: { id: attendanceLogId },
    include: {
      supervisor: { select: { firstName: true, lastName: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  if (!existing) {
    throw new Error("Attendance record not found.");
  }

  if (!canAccessTeamCheckIn(actor)) {
    throw new Error("You do not have permission to edit attendance.");
  }

  if (!canEditAttendanceLog(actor, existing)) {
    throw new Error("You can only edit same-day attendance records.");
  }

  if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    const location = resolveSupervisorLocation(actor);
    if (existing.location !== location) {
      throw new Error("You do not have permission to edit this attendance record.");
    }
  }

  const nextStatus = input.status ?? existing.status;
  const nextCheckInTime =
    input.checkInTime === null
      ? null
      : input.checkInTime
        ? new Date(input.checkInTime)
        : input.status
          ? defaultCheckInTime(nextStatus)
          : existing.checkInTime;

  const updated = await prisma.attendanceLog.update({
    where: { id: attendanceLogId },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
      checkInTime: nextCheckInTime,
      supervisorId: actor.id,
    },
    include: {
      supervisor: { select: { firstName: true, lastName: true } },
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return serializeAttendanceLog(updated, actor);
}
