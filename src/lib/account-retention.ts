import {
  AccessLevel,
  AccountAuditAction,
  AccountStatus,
  EmployeeResponsibility,
  EmploymentStatus,
  OperationalGroup,
  SecurityAuditEventType,
  type Employee,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordSecurityAuditEvent } from "@/lib/security-audit-log";

export const ACCOUNT_RETENTION_DAYS = 90;
export const FORMER_EMPLOYEE_LABEL = "Former Employee";
export const PURGE_SYSTEM_ACTOR = "SYSTEM";

export const PURGE_PRESERVED_RECORD_TYPES = [
  "job service logs (anonymized)",
  "vacation requests (anonymized)",
  "job letter requests (anonymized)",
  "payslip requests (anonymized)",
  "payslips (anonymized)",
  "account audit logs (employee reference cleared)",
  "assigned jobs (anonymized assignment)",
  "attendance logs (anonymized)",
  "equipment requests (anonymized)",
  "bin service logs (anonymized)",
] as const;

export type AccountRestoreSnapshot = {
  accessLevel: AccessLevel;
  accountStatus: AccountStatus;
  employmentStatus: EmploymentStatus;
  operationalGroup: OperationalGroup;
  responsibilities: EmployeeResponsibility[];
  locationAssignment: string | null;
  department: string;
  jobTitle: string;
  position: string | null;
  supervisorName: string | null;
};

export function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function scheduledPurgeDateFrom(removedAt: Date): Date {
  const purgeAt = new Date(removedAt);
  purgeAt.setUTCDate(purgeAt.getUTCDate() + ACCOUNT_RETENTION_DAYS);
  return purgeAt;
}

export function canRestoreRemovedAccount(employee: Pick<Employee, "accountStatus" | "scheduledPurgeAt">): boolean {
  if (employee.accountStatus !== AccountStatus.REMOVED) {
    return false;
  }

  if (!employee.scheduledPurgeAt) {
    return false;
  }

  return employee.scheduledPurgeAt.getTime() > Date.now();
}

export async function buildAccountRestoreSnapshot(
  employee: Employee & {
    responsibilityEntries: { responsibility: EmployeeResponsibility }[];
  },
): Promise<AccountRestoreSnapshot> {
  return {
    accessLevel: employee.accessLevel,
    accountStatus: employee.accountStatus,
    employmentStatus: employee.employmentStatus,
    operationalGroup: employee.operationalGroup,
    responsibilities: employee.responsibilityEntries.map((entry) => entry.responsibility),
    locationAssignment: employee.locationAssignment,
    department: employee.department,
    jobTitle: employee.jobTitle,
    position: employee.position,
    supervisorName: employee.supervisorName,
  };
}

export function parseAccountRestoreSnapshot(
  value: Prisma.JsonValue | null,
): AccountRestoreSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Partial<AccountRestoreSnapshot>;
  if (
    !snapshot.accessLevel ||
    !snapshot.accountStatus ||
    !snapshot.employmentStatus ||
    !snapshot.operationalGroup ||
    !Array.isArray(snapshot.responsibilities) ||
    !snapshot.department ||
    !snapshot.jobTitle
  ) {
    return null;
  }

  return {
    accessLevel: snapshot.accessLevel,
    accountStatus: snapshot.accountStatus,
    employmentStatus: snapshot.employmentStatus,
    operationalGroup: snapshot.operationalGroup,
    responsibilities: snapshot.responsibilities,
    locationAssignment: snapshot.locationAssignment ?? null,
    department: snapshot.department,
    jobTitle: snapshot.jobTitle,
    position: snapshot.position ?? null,
    supervisorName: snapshot.supervisorName ?? null,
  };
}

export function formatPurgeAuditNotes(input: {
  employeeName: string;
  purgedAt: Date;
  recordsPreserved: readonly string[];
}): string {
  return [
    `Account Purged: ${input.employeeName}`,
    `Purged At: ${input.purgedAt.toISOString()}`,
    `Purged By: ${PURGE_SYSTEM_ACTOR}`,
    `Records Preserved: ${input.recordsPreserved.join(", ")}`,
  ].join("\n");
}

export async function getRemovedAccountPurgeSkipReason(
  employee: Pick<Employee, "accessLevel">,
): Promise<string | null> {
  if (employee.accessLevel === AccessLevel.SUPER_ADMIN) {
    return "Super Admin accounts are never purged.";
  }

  if (employee.accessLevel === AccessLevel.ADMIN) {
    const activeAdminCount = await prisma.employee.count({
      where: {
        accountStatus: { not: AccountStatus.REMOVED },
        accessLevel: { in: [AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN] },
      },
    });

    if (activeAdminCount === 0) {
      return "Last active admin protection: no active administrators remain.";
    }
  }

  return null;
}

export type PurgeExpiredAccountEntry = {
  employeeId: string;
  employeeName: string;
  status: "purged" | "skipped" | "error";
  purgedAt?: string;
  purgedBy?: typeof PURGE_SYSTEM_ACTOR;
  recordsPreserved?: readonly string[];
  skipReason?: string;
  error?: string;
};

export type PurgeExpiredAccountsResult = {
  purged: number;
  skipped: number;
  errors: number;
  entries: PurgeExpiredAccountEntry[];
};

export function formatRetentionAuditNotes(input: {
  deletedBy: string;
  employeeName: string;
  scheduledPurgeAt: Date;
  restoredBy?: string;
}): string {
  const purgeLabel = input.scheduledPurgeAt.toISOString().slice(0, 10);
  if (input.restoredBy) {
    return [
      `Employee Deleted: ${input.employeeName}`,
      `Deleted By: ${input.deletedBy}`,
      `Scheduled Purge Date: ${purgeLabel}`,
      `Restored By: ${input.restoredBy}`,
    ].join("\n");
  }

  return [
    `Employee Deleted: ${input.employeeName}`,
    `Deleted By: ${input.deletedBy}`,
    `Scheduled Purge Date: ${purgeLabel}`,
  ].join("\n");
}

export async function deactivateEmployeeAssignments(employeeId: string): Promise<void> {
  await prisma.jobAssignment.updateMany({
    where: { employeeId, isActive: true },
    data: { isActive: false },
  });
}

type RetentionDb = Pick<
  typeof prisma,
  | "jobServiceLog"
  | "vacationRequest"
  | "jobLetterRequest"
  | "payslipRequest"
  | "payslip"
  | "accountAuditLog"
  | "attendanceLog"
  | "equipmentRequest"
  | "binServiceLog"
>;

export async function anonymizeEmployeeHistoricalRecords(
  employeeId: string,
  db: RetentionDb = prisma,
): Promise<void> {
  await Promise.all([
    db.jobServiceLog.updateMany({
      where: { employeeId },
      data: {
        employeeName: FORMER_EMPLOYEE_LABEL,
        employeeEmail: "",
        employeeId: null,
      },
    }),
    db.vacationRequest.updateMany({
      where: { employeeId },
      data: {
        employeeName: FORMER_EMPLOYEE_LABEL,
        employeeEmail: "",
      },
    }),
    db.jobLetterRequest.updateMany({
      where: { employeeId },
      data: {
        employeeName: FORMER_EMPLOYEE_LABEL,
        employeeEmail: "",
      },
    }),
    db.payslipRequest.updateMany({
      where: { employeeId },
      data: {
        employeeName: FORMER_EMPLOYEE_LABEL,
        employeeEmail: "",
      },
    }),
    db.payslip.updateMany({
      where: { employeeId },
      data: {
        employeeName: FORMER_EMPLOYEE_LABEL,
        employeeId: null,
      },
    }),
    db.accountAuditLog.updateMany({
      where: { employeeId },
      data: { employeeId: null },
    }),
    db.attendanceLog.updateMany({
      where: { employeeId },
      data: {
        employeeId: null,
        employeeDisplayName: FORMER_EMPLOYEE_LABEL,
      },
    }),
    db.attendanceLog.updateMany({
      where: { supervisorId: employeeId },
      data: {
        supervisorId: null,
        supervisorDisplayName: FORMER_EMPLOYEE_LABEL,
      },
    }),
    db.equipmentRequest.updateMany({
      where: { requestedById: employeeId },
      data: {
        requestedByName: FORMER_EMPLOYEE_LABEL,
        requestedByEmail: "",
      },
    }),
    db.equipmentRequest.updateMany({
      where: { reviewedById: employeeId },
      data: {
        reviewedByName: FORMER_EMPLOYEE_LABEL,
      },
    }),
    db.binServiceLog.updateMany({
      where: { technicianId: employeeId },
      data: {
        technicianId: null,
        technicianDisplayName: FORMER_EMPLOYEE_LABEL,
      },
    }),
  ]);
}

export async function purgeExpiredRemovedAccounts(): Promise<PurgeExpiredAccountsResult> {
  const expired = await prisma.employee.findMany({
    where: {
      accountStatus: AccountStatus.REMOVED,
      scheduledPurgeAt: { lte: new Date() },
    },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      accessLevel: true,
    },
  });

  const entries: PurgeExpiredAccountEntry[] = [];

  for (const employee of expired) {
    const employeeName = employeeDisplayName(employee);
    const skipReason = await getRemovedAccountPurgeSkipReason(employee);

    if (skipReason) {
      entries.push({
        employeeId: employee.id,
        employeeName,
        status: "skipped",
        skipReason,
      });
      continue;
    }

    try {
      const purgedAt = new Date();

      await prisma.$transaction(async (tx) => {
        await tx.accountAuditLog.create({
          data: {
            employeeId: employee.id,
            employeeName,
            action: AccountAuditAction.ACCOUNT_REMOVED,
            previousValue: "Removed",
            newValue: "Purged",
            changedBy: PURGE_SYSTEM_ACTOR,
            changedAt: purgedAt,
            notes: formatPurgeAuditNotes({
              employeeName,
              purgedAt,
              recordsPreserved: PURGE_PRESERVED_RECORD_TYPES,
            }),
          },
        });

        await anonymizeEmployeeHistoricalRecords(employee.id, tx);

        await tx.employeeResponsibilityEntry.deleteMany({
          where: { employeeId: employee.id },
        });
        await tx.jobAssignment.deleteMany({
          where: { employeeId: employee.id },
        });
        await tx.session.deleteMany({
          where: { userId: employee.userId },
        });
        await tx.account.deleteMany({
          where: { userId: employee.userId },
        });

        await tx.job.updateMany({
          where: { assignedEmployeeId: employee.id },
          data: {
            assignedEmployeeId: null,
            assignedEmployeeName: FORMER_EMPLOYEE_LABEL,
            assignedEmployeeEmail: null,
          },
        });

        await tx.deliveryRequest.updateMany({
          where: { assignedDriverId: employee.id },
          data: {
            assignedDriverId: null,
            assignedDriverName: null,
          },
        });

        await tx.employee.delete({
          where: { id: employee.id },
        });
      });

      entries.push({
        employeeId: employee.id,
        employeeName,
        status: "purged",
        purgedAt: purgedAt.toISOString(),
        purgedBy: PURGE_SYSTEM_ACTOR,
        recordsPreserved: PURGE_PRESERVED_RECORD_TYPES,
      });

      await recordSecurityAuditEvent({
        eventType: SecurityAuditEventType.ACCOUNT_PURGED,
        email: null,
        accessLevel: employee.accessLevel,
        message: `Account purged: ${employeeName}`,
        result: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipped purge for employee ${employee.id}:`, message);
      entries.push({
        employeeId: employee.id,
        employeeName,
        status: "error",
        error: message,
      });
    }
  }

  return {
    purged: entries.filter((entry) => entry.status === "purged").length,
    skipped: entries.filter((entry) => entry.status === "skipped").length,
    errors: entries.filter((entry) => entry.status === "error").length,
    entries,
  };
}

export async function isRemovedEmployeeEmail(email: string): Promise<boolean> {
  const employee = await prisma.employee.findFirst({
    where: {
      companyEmail: email.trim().toLowerCase(),
      accountStatus: AccountStatus.REMOVED,
    },
    select: { id: true },
  });

  return Boolean(employee);
}

export const ACTIVE_EMPLOYEE_FILTER = {
  accountStatus: { not: AccountStatus.REMOVED },
} as const;
