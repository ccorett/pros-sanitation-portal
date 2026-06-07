import {
  AccessLevel,
  AccountStatus,
  EmployeeResponsibility,
  EmploymentStatus,
  OperationalGroup,
  type Employee,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ACCOUNT_RETENTION_DAYS = 90;
export const FORMER_EMPLOYEE_LABEL = "Former Employee";

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
  ]);
}

export async function purgeExpiredRemovedAccounts(): Promise<{
  purged: number;
  employeeIds: string[];
}> {
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
    },
  });

  const purgedIds: string[] = [];

  for (const employee of expired) {
    try {
    await prisma.$transaction(async (tx) => {
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

    purgedIds.push(employee.id);
    } catch (error) {
      console.warn(
        `Skipped purge for employee ${employee.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  return { purged: purgedIds.length, employeeIds: purgedIds };
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
