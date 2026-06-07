import {
  canAssignAccessLevel,
  canPerformAccountAction,
  defaultApprovalAccessLevel,
} from "@/lib/admin-account-permissions";
import {
  derivePositionFromAccessLevel,
  formatAccessLevelLabel,
  formatAccountStatusLabel,
} from "@/lib/access-levels";
import {
  deriveOperationalGroupFromResponsibilities,
  formatResponsibilitiesList,
  getDefaultResponsibilitiesForLevel,
  isValidResponsibilitiesForLevel,
  normalizeResponsibilities,
} from "@/lib/employee-responsibilities";
import {
  getEmployeeLocationSummary,
  setEmployeeLocationAssignments,
} from "@/lib/employee-location-assignment-service";
import {
  isEmployeeDepartment,
  isEmployeeJobTitle,
  isEmployeeLocationAssignment,
} from "@/lib/employee-signup-options";
import {
  buildAccountRestoreSnapshot,
  canRestoreRemovedAccount,
  deactivateEmployeeAssignments,
  employeeDisplayName,
  formatRetentionAuditNotes,
  parseAccountRestoreSnapshot,
  scheduledPurgeDateFrom,
} from "@/lib/account-retention";
import { prisma } from "@/lib/prisma";
import { verifyActorPin } from "@/lib/verify-actor-pin";
import {
  AccessLevel,
  AccountAuditAction,
  AccountStatus,
  EmployeeResponsibility,
  EmploymentStatus,
  Prisma,
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
  primaryLocationAssignment: string;
  additionalLocationAssignments: string[];
  department: string;
  jobTitle: string;
  position: string;
  responsibilities: EmployeeResponsibility[];
  responsibilitiesLabel: string;
  isSuperAdminProtected: boolean;
  lastLoginAt: string | null;
  lastEditedAt: string | null;
  editedBy: string | null;
  removedAt: string | null;
  scheduledPurgeAt: string | null;
  canRestore: boolean;
};

export type AdminAccountsSummary = {
  totalEmployees: number;
  activeAccounts: number;
  pendingVerification: number;
  operations: number;
  sanitationBins: number;
  supervisors: number;
  managers: number;
  admins: number;
  disabledRemoved: number;
};

export type AccountAuditHistoryRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  action: AccountAuditAction;
  actionLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: string;
  notes: string | null;
};

/** @deprecated Use AccountAuditHistoryRow */
export type AccessHistoryRow = AccountAuditHistoryRow;

const AUDIT_ACTION_LABELS: Record<AccountAuditAction, string> = {
  [AccountAuditAction.ACCESS_LEVEL_CHANGED]: "Access level changed",
  [AccountAuditAction.RESPONSIBILITIES_CHANGED]: "Responsibilities changed",
  [AccountAuditAction.ACCOUNT_DISABLED]: "Account disabled",
  [AccountAuditAction.ACCOUNT_REMOVED]: "Account deleted",
  [AccountAuditAction.ACCOUNT_RESTORED]: "Account restored",
};

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

async function loadEmployeeResponsibilities(
  employeeId: string,
  accessLevel: AccessLevel,
  operationalGroup: Employee["operationalGroup"],
): Promise<EmployeeResponsibility[]> {
  const entries = await prisma.employeeResponsibilityEntry.findMany({
    where: { employeeId },
    select: { responsibility: true },
    orderBy: { responsibility: "asc" },
  });

  if (entries.length > 0) {
    return entries.map((entry) => entry.responsibility);
  }

  return getDefaultResponsibilitiesForLevel(accessLevel, operationalGroup);
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

export async function getAdminAccountsSummary(): Promise<AdminAccountsSummary> {
  const employees = await prisma.employee.findMany({
    select: {
      accessLevel: true,
      accountStatus: true,
      department: true,
      operationalGroup: true,
      responsibilityEntries: {
        select: { responsibility: true },
      },
    },
  });

  let activeAccounts = 0;
  let pendingVerification = 0;
  let operations = 0;
  let sanitationBins = 0;
  let supervisors = 0;
  let managers = 0;
  let admins = 0;
  let disabledRemoved = 0;

  for (const employee of employees) {
    if (employee.accountStatus === AccountStatus.REMOVED) {
      disabledRemoved += 1;
      continue;
    }

    const responsibilities =
      employee.responsibilityEntries.length > 0
        ? employee.responsibilityEntries.map((entry) => entry.responsibility)
        : getDefaultResponsibilitiesForLevel(
            employee.accessLevel,
            employee.operationalGroup,
          );

    if (employee.accountStatus === AccountStatus.ACTIVE) {
      activeAccounts += 1;
    }

    if (
      employee.accountStatus === AccountStatus.PENDING ||
      employee.accessLevel === AccessLevel.PENDING_VERIFICATION
    ) {
      pendingVerification += 1;
    }

    if (employee.accountStatus === AccountStatus.DISABLED) {
      disabledRemoved += 1;
    }

    if (employee.accessLevel === AccessLevel.SUPERVISOR) {
      supervisors += 1;
    }

    if (employee.accessLevel === AccessLevel.MANAGER) {
      managers += 1;
    }

    if (
      employee.accessLevel === AccessLevel.ADMIN ||
      employee.accessLevel === AccessLevel.SUPER_ADMIN
    ) {
      admins += 1;
    }

    if (
      employee.department === "Operations" ||
      responsibilities.includes(EmployeeResponsibility.GENERAL_OPERATIONS) ||
      responsibilities.includes(EmployeeResponsibility.DRIVER) ||
      responsibilities.includes(EmployeeResponsibility.DELIVERY_COORDINATOR)
    ) {
      operations += 1;
    }

    if (
      employee.department === "Sanitation" ||
      responsibilities.includes(EmployeeResponsibility.BIN_TECHNICIAN) ||
      responsibilities.includes(EmployeeResponsibility.BIN_SERVICE_SUPERVISOR) ||
      employee.operationalGroup === "BIN_TECHNICIAN" ||
      employee.operationalGroup === "BIN_SERVICE_SUPERVISOR"
    ) {
      sanitationBins += 1;
    }
  }

  return {
    totalEmployees: employees.length,
    activeAccounts,
    pendingVerification,
    operations,
    sanitationBins,
    supervisors,
    managers,
    admins,
    disabledRemoved,
  };
}

export async function listAdminAccounts(options?: {
  includeRemoved?: boolean;
}): Promise<AdminAccountRow[]> {
  const employees = await prisma.employee.findMany({
    where: options?.includeRemoved
      ? undefined
      : { accountStatus: { not: AccountStatus.REMOVED } },
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
      responsibilityEntries: {
        select: { responsibility: true },
        orderBy: { responsibility: "asc" },
      },
    },
  });

  return Promise.all(
    employees.map(async (employee) => {
      const sessionLogin = employee.user.sessions[0]?.updatedAt ?? null;
      const lastLogin = employee.lastLoginAt ?? sessionLogin;
      const responsibilities =
        employee.responsibilityEntries.length > 0
          ? employee.responsibilityEntries.map((entry) => entry.responsibility)
          : await loadEmployeeResponsibilities(
              employee.id,
              employee.accessLevel,
              employee.operationalGroup,
            );

      const locationSummary = await getEmployeeLocationSummary(employee.id);
      const primaryLocation =
        locationSummary.primaryLocation ?? employee.locationAssignment ?? "—";

      return {
        id: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.companyEmail || employee.user.email,
        accessLevel: employee.accessLevel,
        accessLevelLabel: formatAccessLevelLabel(employee.accessLevel),
        accountStatus: employee.accountStatus,
        accountStatusLabel: formatAccountStatusLabel(employee.accountStatus),
        locationAssignment: primaryLocation,
        primaryLocationAssignment: primaryLocation,
        additionalLocationAssignments: locationSummary.additionalLocations,
        department: employee.department,
        jobTitle: employee.jobTitle,
        position: derivePositionFromAccessLevel(employee.accessLevel),
        responsibilities,
        responsibilitiesLabel: formatResponsibilitiesList(responsibilities),
        isSuperAdminProtected: employee.accessLevel === AccessLevel.SUPER_ADMIN,
        lastLoginAt: toIso(lastLogin),
        lastEditedAt: toIso(employee.lastEditedAt),
        editedBy: employee.editedBy,
        removedAt: toIso(employee.removedAt),
        scheduledPurgeAt: toIso(employee.scheduledPurgeAt),
        canRestore: canRestoreRemovedAccount(employee),
      };
    }),
  );
}

export async function getAccountAuditHistoryForEmployee(
  employeeId: string,
): Promise<AccountAuditHistoryRow[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { firstName: true, lastName: true },
  });

  if (!employee) {
    return [];
  }

  const name = `${employee.firstName} ${employee.lastName}`.trim();

  const [auditRows, legacyAccessRows] = await Promise.all([
    prisma.accountAuditLog.findMany({
      where: { employeeId },
      orderBy: { changedAt: "desc" },
    }),
    prisma.accessHistory.findMany({
      where: { employeeId },
      orderBy: { changedAt: "desc" },
    }),
  ]);

  const auditHistory = auditRows.map((row) => ({
    id: row.id,
    employeeId: row.employeeId ?? employeeId,
    employeeName: row.employeeName || name,
    action: row.action,
    actionLabel: AUDIT_ACTION_LABELS[row.action],
    previousValue: row.previousValue,
    newValue: row.newValue,
    changedBy: row.changedBy,
    changedAt: row.changedAt.toISOString(),
    notes: row.notes,
  }));

  const legacyHistory = legacyAccessRows.map((row) => ({
    id: `legacy-${row.id}`,
    employeeId: row.employeeId,
    employeeName: name,
    action: AccountAuditAction.ACCESS_LEVEL_CHANGED,
    actionLabel: AUDIT_ACTION_LABELS[AccountAuditAction.ACCESS_LEVEL_CHANGED],
    previousValue: formatAccessLevelLabel(row.previousLevel),
    newValue: formatAccessLevelLabel(row.newLevel),
    changedBy: row.changedBy,
    changedAt: row.changedAt.toISOString(),
    notes: row.notes,
  }));

  return [...auditHistory, ...legacyHistory].sort(
    (left, right) =>
      new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime(),
  );
}

/** @deprecated Use getAccountAuditHistoryForEmployee */
export async function getAccessHistoryForEmployee(
  employeeId: string,
): Promise<AccountAuditHistoryRow[]> {
  return getAccountAuditHistoryForEmployee(employeeId);
}

async function recordAccountAuditLog(input: {
  employeeId: string;
  employeeName: string;
  action: AccountAuditAction;
  previousValue?: string | null;
  newValue?: string | null;
  changedBy: string;
  notes?: string;
}) {
  return prisma.accountAuditLog.create({
    data: {
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      action: input.action,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      changedBy: input.changedBy,
      notes: input.notes,
    },
  });
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

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { firstName: true, lastName: true },
  });

  await recordAccountAuditLog({
    employeeId,
    employeeName: employee ? employeeDisplayName(employee) : "Former Employee",
    action: AccountAuditAction.ACCESS_LEVEL_CHANGED,
    previousValue: formatAccessLevelLabel(previousLevel),
    newValue: formatAccessLevelLabel(newLevel),
    changedBy,
    notes,
  });

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
  data: Partial<
    Pick<Employee, "accessLevel" | "accountStatus" | "operationalGroup">
  >,
) {
  return prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...data,
      ...(data.accessLevel !== undefined
        ? { position: derivePositionFromAccessLevel(data.accessLevel) }
        : {}),
      lastEditedAt: new Date(),
      editedBy,
    },
  });
}

async function replaceEmployeeResponsibilities(
  employeeId: string,
  responsibilities: EmployeeResponsibility[],
  operationalGroup: Employee["operationalGroup"],
) {
  await prisma.employeeResponsibilityEntry.deleteMany({
    where: { employeeId },
  });

  if (responsibilities.length > 0) {
    await prisma.employeeResponsibilityEntry.createMany({
      data: responsibilities.map((responsibility) => ({
        employeeId,
        responsibility,
      })),
    });
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: { operationalGroup },
  });
}

async function revokeEmployeeSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function updateEmployeeLastLogin(userId: string) {
  await prisma.employee.updateMany({
    where: { userId },
    data: { lastLoginAt: new Date() },
  });
}

export type EmployeeWorkProfileInput = {
  jobTitle: string;
  department: string;
  primaryLocationAssignment: string;
  additionalLocationAssignments?: string[];
};

export type AccountMutationInput = {
  action:
    | "approve"
    | "changeAccessLevel"
    | "updateWorkProfile"
    | "changeResponsibilities"
    | "disable"
    | "deleteAccount"
    | "restoreAccount";
  accessLevel?: AccessLevel;
  responsibilities?: EmployeeResponsibility[];
  notes?: string;
  confirmPin?: string;
  workProfile?: EmployeeWorkProfileInput;
};

function validateWorkProfileInput(input: EmployeeWorkProfileInput): void {
  if (!isEmployeeJobTitle(input.jobTitle)) {
    throw new Error("Select a valid job title.");
  }
  if (!isEmployeeDepartment(input.department)) {
    throw new Error("Select a valid department.");
  }
  if (!isEmployeeLocationAssignment(input.primaryLocationAssignment)) {
    throw new Error("Select a valid primary location.");
  }

  for (const location of input.additionalLocationAssignments ?? []) {
    if (!isEmployeeLocationAssignment(location)) {
      throw new Error("Select valid additional locations.");
    }
  }
}

export async function mutateAdminAccount(
  actor: Employee,
  targetId: string,
  input: AccountMutationInput,
): Promise<AdminAccountRow> {
  const target = await prisma.employee.findUnique({
    where: { id: targetId },
    include: {
      responsibilityEntries: {
        select: { responsibility: true },
        orderBy: { responsibility: "asc" },
      },
    },
  });

  if (!target) {
    throw new Error("Employee not found.");
  }

  const actorName =
    `${actor.firstName} ${actor.lastName}`.trim() || actor.companyEmail;
  const targetName = employeeDisplayName(target);

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
        position: derivePositionFromAccessLevel(target.accessLevel),
        department: input.workProfile.department,
        lastEditedAt: new Date(),
        editedBy: actorName,
      },
    });

    await setEmployeeLocationAssignments(target.id, {
      primaryLocation: input.workProfile.primaryLocationAssignment,
      additionalLocations: input.workProfile.additionalLocationAssignments ?? [],
      assignedBy: actorName,
    });
  } else if (input.action === "changeResponsibilities") {
    if (!input.responsibilities) {
      throw new Error("Responsibilities are required.");
    }

    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "changeResponsibilities",
      )
    ) {
      throw new Error("You cannot edit responsibilities for this account.");
    }

    const nextResponsibilities = normalizeResponsibilities(input.responsibilities);

    if (
      !isValidResponsibilitiesForLevel(target.accessLevel, nextResponsibilities)
    ) {
      throw new Error("Select at least one responsibility for active accounts.");
    }

    const previousResponsibilities =
      target.responsibilityEntries.length > 0
        ? target.responsibilityEntries.map((entry) => entry.responsibility)
        : getDefaultResponsibilitiesForLevel(
            target.accessLevel,
            target.operationalGroup,
          );

    const nextOperationalGroup = deriveOperationalGroupFromResponsibilities(
      nextResponsibilities,
    );

    await recordAccountAuditLog({
      employeeId: target.id,
      employeeName: targetName,
      action: AccountAuditAction.RESPONSIBILITIES_CHANGED,
      previousValue: formatResponsibilitiesList(previousResponsibilities),
      newValue: formatResponsibilitiesList(nextResponsibilities),
      changedBy: actorName,
      notes: input.notes ?? "Responsibilities updated",
    });

    await replaceEmployeeResponsibilities(
      target.id,
      nextResponsibilities,
      nextOperationalGroup,
    );

    await prisma.employee.update({
      where: { id: target.id },
      data: {
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

    await recordAccountAuditLog({
      employeeId: target.id,
      employeeName: targetName,
      action: AccountAuditAction.ACCOUNT_DISABLED,
      previousValue: formatAccountStatusLabel(target.accountStatus),
      newValue: formatAccountStatusLabel(AccountStatus.DISABLED),
      changedBy: actorName,
      notes: input.notes ?? "Account disabled",
    });

    await touchEmployeeAudit(target.id, actorName, {
      accountStatus: AccountStatus.DISABLED,
    });

    await revokeEmployeeSessions(target.userId);
  } else if (input.action === "deleteAccount") {
    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "deleteAccount",
      )
    ) {
      throw new Error("You cannot delete this account.");
    }

    if (!input.confirmPin) {
      throw new Error("Super Admin PIN is required to delete an account.");
    }

    const pinValid = await verifyActorPin(actor.userId, input.confirmPin);
    if (!pinValid) {
      throw new Error("Invalid Super Admin PIN.");
    }

    const removedAt = new Date();
    const scheduledPurgeAt = scheduledPurgeDateFrom(removedAt);
    const restoreSnapshot = await buildAccountRestoreSnapshot(target);

    await recordAccountAuditLog({
      employeeId: target.id,
      employeeName: targetName,
      action: AccountAuditAction.ACCOUNT_REMOVED,
      previousValue: formatAccountStatusLabel(target.accountStatus),
      newValue: formatAccountStatusLabel(AccountStatus.REMOVED),
      changedBy: actorName,
      notes:
        input.notes ??
        formatRetentionAuditNotes({
          deletedBy: actorName,
          employeeName: targetName,
          scheduledPurgeAt,
        }),
    });

    await touchEmployeeAudit(target.id, actorName, {
      accountStatus: AccountStatus.REMOVED,
    });

    await prisma.employee.update({
      where: { id: target.id },
      data: {
        employmentStatus: EmploymentStatus.DISABLED,
        removedAt,
        scheduledPurgeAt,
        restoreSnapshot,
      },
    });

    await deactivateEmployeeAssignments(target.id);
    await revokeEmployeeSessions(target.userId);
  } else if (input.action === "restoreAccount") {
    if (
      !canPerformAccountAction(
        actor.accessLevel,
        target.accessLevel,
        target.accountStatus,
        "restoreAccount",
      )
    ) {
      throw new Error("You cannot restore this account.");
    }

    if (!canRestoreRemovedAccount(target)) {
      throw new Error("This account can no longer be restored.");
    }

    const snapshot = parseAccountRestoreSnapshot(target.restoreSnapshot);
    if (!snapshot) {
      throw new Error("Restore snapshot is missing for this account.");
    }

    const restoredStatus =
      snapshot.accountStatus === AccountStatus.REMOVED
        ? AccountStatus.ACTIVE
        : snapshot.accountStatus;

    await recordAccountAuditLog({
      employeeId: target.id,
      employeeName: targetName,
      action: AccountAuditAction.ACCOUNT_RESTORED,
      previousValue: formatAccountStatusLabel(AccountStatus.REMOVED),
      newValue: formatAccountStatusLabel(restoredStatus),
      changedBy: actorName,
      notes: `Employee Restored: ${targetName}\nRestored By: ${actorName}`,
    });

    await replaceEmployeeResponsibilities(
      target.id,
      snapshot.responsibilities,
      snapshot.operationalGroup,
    );

    await prisma.employee.update({
      where: { id: target.id },
      data: {
        accessLevel: snapshot.accessLevel,
        accountStatus: restoredStatus,
        employmentStatus: snapshot.employmentStatus,
        operationalGroup: snapshot.operationalGroup,
        locationAssignment: snapshot.locationAssignment,
        department: snapshot.department,
        jobTitle: snapshot.jobTitle,
        position: snapshot.position,
        supervisorName: snapshot.supervisorName,
        removedAt: null,
        scheduledPurgeAt: null,
        restoreSnapshot: Prisma.DbNull,
        lastEditedAt: new Date(),
        editedBy: actorName,
      },
    });

    await prisma.jobAssignment.updateMany({
      where: { employeeId: target.id },
      data: { isActive: true },
    });
  }

  const rows = await listAdminAccounts({ includeRemoved: true });
  const updated = rows.find((row) => row.id === targetId);

  if (!updated) {
    throw new Error("Unable to load updated account.");
  }

  return updated;
}
