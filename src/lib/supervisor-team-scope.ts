import type { Employee } from "@prisma/client";
import { AccessLevel, OperationalGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Employee IDs a supervisor may view (same location / bin route only). */
export async function getSupervisorVisibleEmployeeIds(
  supervisor: Employee,
): Promise<string[]> {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return [];
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    if (!supervisor.locationAssignment) {
      return [supervisor.id];
    }

    const technicians = await prisma.employee.findMany({
      where: {
        operationalGroup: OperationalGroup.BIN_TECHNICIAN,
        locationAssignment: supervisor.locationAssignment,
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true },
    });

    return [supervisor.id, ...technicians.map((row) => row.id)];
  }

  if (
    supervisor.operationalGroup === OperationalGroup.GENERAL &&
    supervisor.locationAssignment
  ) {
    const teamMembers = await prisma.employee.findMany({
      where: {
        locationAssignment: supervisor.locationAssignment,
        operationalGroup: { not: OperationalGroup.BIN_TECHNICIAN },
        accessLevel: AccessLevel.TEAM_MEMBER,
      },
      select: { id: true },
    });

    return [supervisor.id, ...teamMembers.map((row) => row.id)];
  }

  return [supervisor.id];
}
