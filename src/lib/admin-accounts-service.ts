import {
  canAssignAccessLevel,
  canPerformAccountAction,
  defaultApprovalAccessLevel,
} from "@/lib/admin-account-permissions";
import { formatAccessLevelLabel, formatAccountStatusLabel } from "@/lib/access-levels";
import {
  isEmployeeDepartment,
  isEmployeeJobTitle,
  isEmployeeLocationAssignment,
  isEmployeePosition,
} from "@/lib/employee-signup-options";
import { prisma } from "@/lib/prisma";
import {
  AccessLevel,
  AccountStatus,
  type AccessHistory,
  type Employee,
} from "@prisma/client";

export type AdminAccountRow = {
  id: string;
  employeeName: string;
  email: string;
  accessLevel: AccessLevel;
  accessLevelLabel: string;
  accountStatus: AccountStatus;
  accountStatusLabel: string;
  locationAssignment: string;
  department: string;
  jobTitle: string;
  position: string;
  lastLoginAt: string | null;
  lastEditedAt: string | null;
  editedBy: string | null;
};

export type AccessHistoryRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  previousLevel: AccessLevel;
  previousLevelLabel: string;
  newLevel: AccessLevel;
  newLevelLabel: string;
  changedBy: string;
  changedAt: string;
  notes: string | null;
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export async function countPendingVerificationAccounts(): Promise<number> {
  return prisma.employee.count({
    where: {
      accountStatus: { not: AccountStatus.REMOVED },
      OR: [
        { accountStatus: AccountStatus.PENDING },
        { accessLevel: AccessLevel.PENDING_VERIFICATION },
      ],
    },
  });
}

export async function listAdminAccounts(): Promise<AdminAccountRow[]> {
  const employees = await prisma.employee.findMany({
    orderBy: [{ accountStatus: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: {
      user: {
        select: {
          email: true,
          sessions: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
    },
  });

  return employees.map((employee) => {
    const sessionLogin = employee.user.sessions[0]?.updatedAt ?? null;
    const lastLogin = employee.lastLoginAt ?? sessionLogin;

    return {
      id: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.companyEmail || employee.user.email,
      accessLevel: employee.accessLevel,
      accessLevelLabel: formatAccessLevelLabel(employee.accessLevel),
      accountStatus: employee.accountStatus,
      accountStatusLabel: formatAccountStatusLabel(employee.accountStatus),
      locationAssignment: employee.locationAssignment ?? "—",
      department: employee.department,
      jobTitle: employee.jobTitle,
      position: employee.position ?? "—",
      lastLoginAt: toIso(lastLogin),
      lastEditedAt: toIso(employee.lastEditedAt),
      editedBy: employee.editedBy,
    };
  });
}

export async function getAccessHistoryForEmployee(
  employeeId: string,
): Promise<AccessHistoryRow[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { firstName: true, lastName: true },
  });

  if (!employee) {
    return [];
  }

  const rows = await prisma.accessHistory.findMany({
    where: { employeeId },
    orderBy: { changedAt: "desc" },
  });

  const name = `${employee.firstName} ${employee.lastName}`.trim();

  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId,
    employeeName: name,
    previousLevel: row.previousLevel,
    previousLevelLabel: formatAccessLevelLabel(row.previousLevel),
    newLevel: row.newLevel,
    newLevelLabel: formatAccessLevelLabel(row.newLevel),
    changedBy: row.changedBy,
    changedAt: row.changedAt.toISOString(),
    notes: row.notes,
  }));
}

async function recordAccessLevelChange(
  employeeId: string,
  previousLevel: AccessLevel,
  newLevel: AccessLevel,
  changedBy: string,
  notes?: string,
): Promise<AccessHistory | null> {
  if (previousLevel === newLevel) {
    return null;
  }

  return prisma.accessHistory.create({
    data: {
      employeeId,
      previousLevel,
      newLevel,
      changedBy,
      notes,
    },
  });
}

async function touchEmployeeAudit(
  employeeId: string,
  editedBy: string,
  data: Partial<Pick<Employee, "accessLevel" | "accountStatus">>,
) {
  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...data,
      lastEditedAt: new Date(),
      editedBy,
    },
  });
}

export async function updateEmployeeLastLogin(userId: string) {
  await prisma.employee.updateMany({
    where: { userId },
    data: { lastLoginAt: new Date() },
  });
}

export type EmployeeWorkProfileInput = {
  jobTitle: string;
  position: string;
  department: string;
  locationAssignment: string;
};

export type AccountMutationInput = {
  action:
    | "approve"
    | "changeAccessLevel"
    | "updateWorkProfile"
    | "disable"
    | "remove";
  accessLevel?: AccessLevel;
  notes?: string;
  workProfile?: EmployeeWorkProfileInput;
};

function validateWorkProfileInput(input: EmployeeWorkProfileInput): void {
  if (!isEmployeeJobTitle(input.jobTitle)) {
    throw new Error("Select a valid job title.");
  }
  if (!isEmployeePosition(input.position)) {
    throw new Error("Select a valid position.");
  }
  if (!isEmployeeDepartment(input.department)) {
    throw new Error("Select a valid department.");
  }
  if (!isEmployeeLocationAssignment(input.locationAssignment)) {
    throw new Error("Select a valid location assignment.");
  }
}

export async function mutateAdminAccount(
  actor: Employee,
  targetId: string,
  input: AccountMutationInput,
): Promise<AdminAccountRow> {
  const target = await prisma.employee.findUnique({ where: { id: targetId } });

  if (!target) {
    throw new Error("Employee not found.");
  }

  const actorName =
    `${actor.firstName} ${actor.lastName}`.trim() || actor.companyEmail;

  if (input.action === "approve") {
    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "approve",
      )
    ) {
      throw new Error("You cannot approve this account.");
    }

    const newLevel =
      input.accessLevel && canAssignAccessLevel(actor.accessLevel, input.accessLevel)
        ? input.accessLevel
        : defaultApprovalAccessLevel();

    if (!canAssignAccessLevel(actor.accessLevel, newLevel)) {
      throw new Error("You cannot assign that access level.");
    }

    await recordAccessLevelChange(
      target.id,
      target.accessLevel,
      newLevel,
      actorName,
      input.notes ?? "Account approved",
    );

    await touchEmployeeAudit(target.id, actorName, {
      accessLevel: newLevel,
      accountStatus: AccountStatus.ACTIVE,
    });
  } else if (input.action === "changeAccessLevel") {
    if (!input.accessLevel) {
      throw new Error("Access level is required.");
    }

    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "changeAccessLevel",
      )
    ) {
      throw new Error("You cannot edit this account.");
    }

    if (!canAssignAccessLevel(actor.accessLevel, input.accessLevel)) {
      throw new Error("You cannot assign that access level.");
    }

    await recordAccessLevelChange(
      target.id,
      target.accessLevel,
      input.accessLevel,
      actorName,
      input.notes ?? "Access level updated",
    );

    const nextStatus =
      input.accessLevel === AccessLevel.PENDING_VERIFICATION
        ? AccountStatus.PENDING
        : target.accountStatus === AccountStatus.PENDING
          ? AccountStatus.ACTIVE
          : target.accountStatus;

    await touchEmployeeAudit(target.id, actorName, {
      accessLevel: input.accessLevel,
      accountStatus: nextStatus,
    });
  } else if (input.action === "updateWorkProfile") {
    if (!input.workProfile) {
      throw new Error("Work profile fields are required.");
    }

    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "editWorkProfile",
      )
    ) {
      throw new Error("You cannot edit this employee profile.");
    }

    validateWorkProfileInput(input.workProfile);

    await prisma.employee.update({
      where: { id: target.id },
      data: {
        jobTitle: input.workProfile.jobTitle,
        position: input.workProfile.position,
        department: input.workProfile.department,
        locationAssignment: input.workProfile.locationAssignment,
        lastEditedAt: new Date(),
        editedBy: actorName,
      },
    });
  } else if (input.action === "disable") {
    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "disable",
      )
    ) {
      throw new Error("You cannot disable this account.");
    }

    await touchEmployeeAudit(target.id, actorName, {
      accountStatus: AccountStatus.DISABLED,
    });
  } else if (input.action === "remove") {
    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "remove",
      )
    ) {
      throw new Error("You cannot remove this account.");
    }

    await touchEmployeeAudit(target.id, actorName, {
      accountStatus: AccountStatus.REMOVED,
    });
  }

  const rows = await listAdminAccounts();
  const updated = rows.find((row) => row.id === targetId);

  if (!updated) {
    throw new Error("Unable to load updated account.");
  }

  return updated;
}
