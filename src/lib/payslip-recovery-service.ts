import type { Employee } from "@prisma/client";
import {
  employeeDisplayName,
  matchEmployeeByPayslipRecord,
} from "@/lib/payslip-employee-matching";
import type { PayslipArchiveDto } from "@/lib/payslip-archive-service";
import { normalizePayPeriod } from "@/lib/payslip-pay-period";
import { prisma } from "@/lib/prisma";

export type SkippedPayslipDto = {
  id: string;
  employeeName: string;
  employeeEmail: string | null;
  payPeriod: string;
  grossPay: string | null;
  netPay: string | null;
  source: string | null;
  uploadedAt: string;
};

export type PayslipRecoveryEmployeeOption = {
  id: string;
  employeePublicId: string;
  fullName: string;
  companyEmail: string;
};

export type PayslipRecoveryResult = {
  recovered: number;
  remaining: number;
  normalizedPayPeriods: number;
  recoveredPayslipIds: string[];
};

export async function listSkippedPayslips(): Promise<SkippedPayslipDto[]> {
  const rows = await prisma.payslip.findMany({
    where: { employeeId: null },
    orderBy: [{ payPeriod: "desc" }, { uploadedAt: "desc" }],
    select: {
      id: true,
      employeeName: true,
      employeeEmail: true,
      payPeriod: true,
      grossPay: true,
      netPay: true,
      source: true,
      uploadedAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    employeeName: row.employeeName,
    employeeEmail: row.employeeEmail,
    payPeriod: row.payPeriod,
    grossPay: row.grossPay?.toFixed(2) ?? null,
    netPay: row.netPay?.toFixed(2) ?? null,
    source: row.source,
    uploadedAt: row.uploadedAt.toISOString(),
  }));
}

export async function searchEmployeesForRecovery(
  query: string,
  limit = 10,
): Promise<PayslipRecoveryEmployeeOption[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const rows = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: trimmed, mode: "insensitive" } },
        { lastName: { contains: trimmed, mode: "insensitive" } },
        { companyEmail: { contains: trimmed, mode: "insensitive" } },
        { employeeId: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      companyEmail: true,
    },
    take: limit,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    employeePublicId: row.employeeId,
    fullName: employeeDisplayName(row),
    companyEmail: row.companyEmail.trim().toLowerCase(),
  }));
}

async function linkPayslipToEmployee(
  payslipId: string,
  employee: Employee,
): Promise<void> {
  const employeeName = employeeDisplayName(employee);
  const employeeEmail = employee.companyEmail.trim().toLowerCase();

  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    select: { payPeriod: true },
  });

  if (!payslip) {
    throw new Error("Skipped payslip not found.");
  }

  const existing = await prisma.payslip.findFirst({
    where: {
      employeeId: employee.id,
      payPeriod: payslip.payPeriod,
      NOT: { id: payslipId },
    },
  });

  if (existing) {
    throw new Error(
      `Employee already has a payslip for ${payslip.payPeriod}. Remove the duplicate first.`,
    );
  }

  await prisma.payslip.update({
    where: { id: payslipId },
    data: {
      employeeId: employee.id,
      employeeName,
      employeeEmail,
      source: "csv_upload_recovered",
    },
  });
}

export async function assignSkippedPayslip(
  payslipId: string,
  employeeId: string,
): Promise<PayslipArchiveDto> {
  const payslip = await prisma.payslip.findFirst({
    where: { id: payslipId, employeeId: null },
  });

  if (!payslip) {
    throw new Error("Skipped payslip not found.");
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    throw new Error("Employee not found.");
  }

  await linkPayslipToEmployee(payslipId, employee);

  const updated = await prisma.payslip.findUnique({
    where: { id: payslipId },
  });

  if (!updated) {
    throw new Error("Unable to load recovered payslip.");
  }

  return {
    id: updated.id,
    employeeId: updated.employeeId,
    employeeName: updated.employeeName,
    employeeEmail: updated.employeeEmail,
    payPeriod: updated.payPeriod,
    grossPay: updated.grossPay?.toFixed(2) ?? null,
    healthSurcharge: updated.healthSurcharge?.toFixed(2) ?? null,
    nis: updated.nis?.toFixed(2) ?? null,
    paye: updated.paye?.toFixed(2) ?? null,
    companyDeductions: updated.companyDeductions?.toFixed(2) ?? null,
    netPay: updated.netPay?.toFixed(2) ?? null,
    grossPayDetails: updated.grossPayDetails,
    companyDeductionDetails: updated.companyDeductionDetails,
    fileName: updated.fileName,
    fileUrl: updated.fileUrl,
    uploadedBy: updated.uploadedBy,
    uploadedAt: updated.uploadedAt.toISOString(),
    importedAt: updated.importedAt?.toISOString() ?? null,
    archived: updated.archived,
    statusLabel: updated.archived ? "Archived" : "Imported",
    source: updated.source,
  };
}

export async function normalizeStoredPayPeriods(): Promise<number> {
  const rows = await prisma.payslip.findMany({
    select: { id: true, payPeriod: true },
  });

  let updated = 0;

  for (const row of rows) {
    const normalized = normalizePayPeriod(row.payPeriod);
    if (normalized !== row.payPeriod) {
      await prisma.payslip.update({
        where: { id: row.id },
        data: { payPeriod: normalized },
      });
      updated += 1;
    }
  }

  return updated;
}

export async function autoRecoverSkippedPayslips(): Promise<PayslipRecoveryResult> {
  const normalizedPayPeriods = await normalizeStoredPayPeriods();
  const employees = await prisma.employee.findMany();
  const skipped = await prisma.payslip.findMany({
    where: { employeeId: null },
    orderBy: { uploadedAt: "asc" },
  });

  const recoveredPayslipIds: string[] = [];

  for (const payslip of skipped) {
    const match = matchEmployeeByPayslipRecord(
      payslip.employeeName,
      payslip.employeeEmail,
      employees,
    );

    if (!match.employee || match.uncertain) {
      continue;
    }

    const duplicate = await prisma.payslip.findFirst({
      where: {
        employeeId: match.employee.id,
        payPeriod: payslip.payPeriod,
        NOT: { id: payslip.id },
      },
    });

    if (duplicate) {
      continue;
    }

    await linkPayslipToEmployee(payslip.id, match.employee);
    recoveredPayslipIds.push(payslip.id);
  }

  const remaining = await prisma.payslip.count({ where: { employeeId: null } });

  return {
    recovered: recoveredPayslipIds.length,
    remaining,
    normalizedPayPeriods,
    recoveredPayslipIds,
  };
}
