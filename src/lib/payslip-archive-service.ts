import type { Employee, Payslip, Prisma } from "@prisma/client";
import {
  comparePayPeriods,
  isPayPeriodWithinVisibleWindow,
  PAYSLIP_VISIBLE_MONTH_COUNT,
} from "@/lib/payslip-pay-period";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type PayslipArchiveDto = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeEmail: string | null;
  payPeriod: string;
  grossPay: string | null;
  healthSurcharge: string | null;
  nis: string | null;
  paye: string | null;
  companyDeductions: string | null;
  netPay: string | null;
  grossPayDetails: string | null;
  companyDeductionDetails: string | null;
  fileName: string | null;
  fileUrl: string | null;
  uploadedBy: string | null;
  uploadedAt: string;
  importedAt: string | null;
  archived: boolean;
  statusLabel: string;
  source: string | null;
};

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toFixed(2);
}

function serializePayslip(
  row: Payslip,
  employeeName?: string,
): PayslipArchiveDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeName ?? row.employeeName,
    employeeEmail: row.employeeEmail,
    payPeriod: row.payPeriod,
    grossPay: decimalToString(row.grossPay),
    healthSurcharge: decimalToString(row.healthSurcharge),
    nis: decimalToString(row.nis),
    paye: decimalToString(row.paye),
    companyDeductions: decimalToString(row.companyDeductions),
    netPay: decimalToString(row.netPay),
    grossPayDetails: row.grossPayDetails,
    companyDeductionDetails: row.companyDeductionDetails,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
    importedAt: row.importedAt?.toISOString() ?? null,
    archived: row.archived,
    statusLabel: row.archived ? "Archived" : "Current",
    source: row.source,
  };
}

function sortPayslipsNewestFirst(rows: PayslipArchiveDto[]): PayslipArchiveDto[] {
  return [...rows].sort((left, right) => comparePayPeriods(left.payPeriod, right.payPeriod));
}

function resolveEmployeeName(
  row: Payslip & {
    employee?: { firstName: string; lastName: string } | null;
  },
): string {
  if (row.employee) {
    return `${row.employee.firstName} ${row.employee.lastName}`.trim();
  }
  return row.employeeName;
}

export async function listPayslipsForEmployee(
  employeeId: string,
): Promise<PayslipArchiveDto[]> {
  const rows = await prisma.payslip.findMany({
    where: {
      employeeId,
      archived: false,
    },
    orderBy: [{ importedAt: "desc" }, { uploadedAt: "desc" }],
  });

  const visible = rows
    .filter((row) => isPayPeriodWithinVisibleWindow(row.payPeriod))
    .map((row) => serializePayslip(row, row.employeeName));

  return sortPayslipsNewestFirst(visible).slice(0, PAYSLIP_VISIBLE_MONTH_COUNT);
}

export async function listAllPayslipsForAdmin(): Promise<PayslipArchiveDto[]> {
  const rows = await prisma.payslip.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ importedAt: "desc" }, { uploadedAt: "desc" }],
  });

  return sortPayslipsNewestFirst(
    rows.map((row) => serializePayslip(row, resolveEmployeeName(row))),
  );
}

export async function listPayslipsForActor(actor: Employee): Promise<PayslipArchiveDto[]> {
  if (isManagerOrAbove(actor.accessLevel)) {
    return listAllPayslipsForAdmin();
  }

  return listPayslipsForEmployee(actor.id);
}

export async function getPayslipDetailForActor(
  payslipId: string,
  actor: Employee,
): Promise<PayslipArchiveDto | null> {
  const row = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  if (!row) {
    return null;
  }

  if (!isManagerOrAbove(actor.accessLevel)) {
    if (row.employeeId !== actor.id || row.archived) {
      return null;
    }

    if (!isPayPeriodWithinVisibleWindow(row.payPeriod)) {
      return null;
    }
  }

  return serializePayslip(row, resolveEmployeeName(row));
}

export async function getPayslipForEmployee(
  payslipId: string,
  employeeId: string,
): Promise<Payslip | null> {
  return prisma.payslip.findFirst({
    where: { id: payslipId, employeeId, archived: false },
  });
}

export async function getPayslipById(payslipId: string): Promise<Payslip | null> {
  return prisma.payslip.findUnique({ where: { id: payslipId } });
}

export async function countVisiblePayslipsForEmployee(employeeId: string): Promise<number> {
  const rows = await prisma.payslip.findMany({
    where: { employeeId, archived: false },
    select: { payPeriod: true },
  });

  return rows.filter((row) => isPayPeriodWithinVisibleWindow(row.payPeriod)).length;
}

export type CreatePayslipArchiveInput = {
  employeeId: string;
  payPeriod: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
};

export async function createPayslipArchive(
  input: CreatePayslipArchiveInput,
): Promise<PayslipArchiveDto> {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { firstName: true, lastName: true, companyEmail: true },
  });

  if (!employee) {
    throw new Error("Employee not found.");
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`.trim();

  const row = await prisma.payslip.create({
    data: {
      employeeId: input.employeeId,
      employeeName,
      employeeEmail: employee.companyEmail.trim().toLowerCase(),
      payPeriod: input.payPeriod.trim(),
      fileName: input.fileName.trim(),
      fileUrl: input.fileUrl.trim(),
      uploadedBy: input.uploadedBy.trim(),
      source: "manual",
    },
  });

  return serializePayslip(row, employeeName);
}

export type UpdatePayslipArchiveInput = {
  payPeriod?: string;
  fileName?: string;
  fileUrl?: string;
};

export async function updatePayslipArchive(
  id: string,
  input: UpdatePayslipArchiveInput,
): Promise<PayslipArchiveDto> {
  const row = await prisma.payslip.update({
    where: { id },
    data: {
      ...(input.payPeriod !== undefined
        ? { payPeriod: input.payPeriod.trim() }
        : {}),
      ...(input.fileName !== undefined ? { fileName: input.fileName.trim() } : {}),
      ...(input.fileUrl !== undefined ? { fileUrl: input.fileUrl.trim() } : {}),
    },
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
  });

  return serializePayslip(row, resolveEmployeeName(row));
}

export async function deletePayslipArchive(id: string): Promise<void> {
  await prisma.payslip.delete({ where: { id } });
}

export async function findEmployeeForAdminPayslipUpload(
  employeePublicId: string,
): Promise<Employee | null> {
  return prisma.employee.findUnique({
    where: { employeeId: employeePublicId.trim() },
  });
}

export function formatPayslipMoney(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return value;
  }

  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
