import { Prisma, type Employee } from "@prisma/client";
import { parsePayrollCsvContent, type PayslipCsvRow } from "@/lib/payslip-csv-import";
import {
  normalizePayPeriod,
  shouldArchivePayPeriod,
} from "@/lib/payslip-pay-period";
import { prisma } from "@/lib/prisma";

export type ParsedPayslipRow = {
  rowNumber: number;
  employeeName: string;
  email: string;
  payPeriod: string;
  grossPay: Prisma.Decimal | null;
  healthSurcharge: Prisma.Decimal | null;
  nis: Prisma.Decimal | null;
  paye: Prisma.Decimal | null;
  companyDeductions: Prisma.Decimal | null;
  netPay: Prisma.Decimal | null;
  grossPayDetails: string | null;
  companyDeductionDetails: string | null;
};

export type PayslipImportPreviewItem = {
  rowNumber: number;
  employeeName: string;
  email: string;
  payPeriod: string;
  grossPay: string | null;
  netPay: string | null;
  employeeId?: string;
  matchedEmployeeName?: string;
  existingPayslipId?: string;
};

export type PayslipImportPreview = {
  fileName: string;
  payPeriods: string[];
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  matched: PayslipImportPreviewItem[];
  unmatched: PayslipImportPreviewItem[];
  duplicates: PayslipImportPreviewItem[];
};

export type PayslipImportResult = {
  recordsImported: number;
  recordsUpdated: number;
  recordsSkipped: number;
  unmatchedEmployees: string[];
  archived: number;
  auditLogId: string;
};

export type PayslipImportAuditDto = {
  id: string;
  importedByName: string;
  importedAt: string;
  fileName: string;
  recordsImported: number;
  recordsUpdated: number;
  recordsSkipped: number;
  unmatchedEmployees: string[];
};

const FIELD_ALIASES: Record<keyof Omit<ParsedPayslipRow, "rowNumber" | "payPeriod">, string[]> = {
  employeeName: ["employee name", "name"],
  email: ["email", "company email", "employee email"],
  grossPay: ["gross pay"],
  healthSurcharge: ["health surcharge"],
  nis: ["nis"],
  paye: ["paye"],
  companyDeductions: ["company deductions"],
  netPay: ["net pay"],
  grossPayDetails: ["gross pay details", "gross pay breakdown"],
  companyDeductionDetails: [
    "company deduction details",
    "deduction breakdown",
    "company deductions details",
  ],
};

function pickValue(row: PayslipCsvRow, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias];
    if (value?.trim()) {
      return value.trim();
    }
  }
  return "";
}

function parseMoney(value: string): Prisma.Decimal | null {
  const cleaned = value.replace(/[^0-9.-]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  try {
    return new Prisma.Decimal(cleaned);
  } catch {
    return null;
  }
}

function decimalToString(value: Prisma.Decimal | null): string | null {
  return value?.toFixed(2) ?? null;
}

function parseCsvRow(row: PayslipCsvRow, rowNumber: number): ParsedPayslipRow | null {
  const employeeName = pickValue(row, FIELD_ALIASES.employeeName);
  const email = pickValue(row, FIELD_ALIASES.email).toLowerCase();
  const payPeriodRaw = pickValue(row, ["pay period", "period"]);

  if (!employeeName && !email) {
    return null;
  }

  if (!payPeriodRaw) {
    return null;
  }

  return {
    rowNumber,
    employeeName,
    email,
    payPeriod: normalizePayPeriod(payPeriodRaw),
    grossPay: parseMoney(pickValue(row, FIELD_ALIASES.grossPay)),
    healthSurcharge: parseMoney(pickValue(row, FIELD_ALIASES.healthSurcharge)),
    nis: parseMoney(pickValue(row, FIELD_ALIASES.nis)),
    paye: parseMoney(pickValue(row, FIELD_ALIASES.paye)),
    companyDeductions: parseMoney(pickValue(row, FIELD_ALIASES.companyDeductions)),
    netPay: parseMoney(pickValue(row, FIELD_ALIASES.netPay)),
    grossPayDetails: pickValue(row, FIELD_ALIASES.grossPayDetails) || null,
    companyDeductionDetails:
      pickValue(row, FIELD_ALIASES.companyDeductionDetails) || null,
  };
}

function normalizeEmployeeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function matchEmployee(row: ParsedPayslipRow, employees: Employee[]): Employee | null {
  if (row.email) {
    const byEmail = employees.find(
      (employee) => employee.companyEmail.trim().toLowerCase() === row.email,
    );
    if (byEmail) {
      return byEmail;
    }
  }

  if (row.employeeName) {
    const targetName = normalizeEmployeeName(row.employeeName);
    const matches = employees.filter(
      (employee) => normalizeEmployeeName(employeeDisplayName(employee)) === targetName,
    );
    if (matches.length === 1) {
      return matches[0];
    }
  }

  return null;
}

function unmatchedLabel(row: ParsedPayslipRow): string {
  if (row.email) {
    return `${row.employeeName || "Unknown"} <${row.email}>`;
  }
  return row.employeeName || `Row ${row.rowNumber}`;
}

function toPreviewItem(
  row: ParsedPayslipRow,
  options?: {
    employeeId?: string;
    matchedEmployeeName?: string;
    existingPayslipId?: string;
  },
): PayslipImportPreviewItem {
  return {
    rowNumber: row.rowNumber,
    employeeName: row.employeeName,
    email: row.email,
    payPeriod: row.payPeriod,
    grossPay: decimalToString(row.grossPay),
    netPay: decimalToString(row.netPay),
    employeeId: options?.employeeId,
    matchedEmployeeName: options?.matchedEmployeeName,
    existingPayslipId: options?.existingPayslipId,
  };
}

function payslipDataFromRow(
  row: ParsedPayslipRow,
  employee: Employee,
  importedAt: Date,
): Prisma.PayslipUncheckedCreateInput {
  return {
    employeeId: employee.id,
    employeeName: employeeDisplayName(employee),
    employeeEmail: employee.companyEmail.trim().toLowerCase(),
    payPeriod: row.payPeriod,
    grossPay: row.grossPay,
    healthSurcharge: row.healthSurcharge,
    nis: row.nis,
    paye: row.paye,
    companyDeductions: row.companyDeductions,
    netPay: row.netPay,
    grossPayDetails: row.grossPayDetails,
    companyDeductionDetails: row.companyDeductionDetails,
    importedAt,
    archived: shouldArchivePayPeriod(row.payPeriod, importedAt),
    source: "csv_upload",
  };
}

export async function applyPayslipRetention(referenceDate = new Date()): Promise<number> {
  const payslips = await prisma.payslip.findMany({
    select: { id: true, payPeriod: true, archived: true },
  });

  let archived = 0;

  for (const payslip of payslips) {
    const shouldArchive = shouldArchivePayPeriod(payslip.payPeriod, referenceDate);
    if (shouldArchive && !payslip.archived) {
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: { archived: true },
      });
      archived += 1;
      continue;
    }

    if (!shouldArchive && payslip.archived) {
      await prisma.payslip.update({
        where: { id: payslip.id },
        data: { archived: false },
      });
    }
  }

  return archived;
}

async function buildImportPreview(
  csvContent: string,
  fileName: string,
): Promise<PayslipImportPreview> {
  const csvRows = parsePayrollCsvContent(csvContent);
  const employees = await prisma.employee.findMany();
  const existingPayslips = await prisma.payslip.findMany({
    where: { employeeId: { not: null } },
    select: { id: true, employeeId: true, payPeriod: true },
  });

  const existingByKey = new Map(
    existingPayslips.map((row) => [`${row.employeeId}:${row.payPeriod}`, row.id]),
  );

  const matched: PayslipImportPreviewItem[] = [];
  const unmatched: PayslipImportPreviewItem[] = [];
  const duplicates: PayslipImportPreviewItem[] = [];
  const payPeriodSet = new Set<string>();

  csvRows.forEach((csvRow, index) => {
    const parsed = parseCsvRow(csvRow, index + 1);
    if (!parsed) {
      return;
    }

    payPeriodSet.add(parsed.payPeriod);
    const employee = matchEmployee(parsed, employees);

    if (!employee) {
      unmatched.push(toPreviewItem(parsed));
      return;
    }

    const existingPayslipId = existingByKey.get(`${employee.id}:${parsed.payPeriod}`);
    const item = toPreviewItem(parsed, {
      employeeId: employee.id,
      matchedEmployeeName: employeeDisplayName(employee),
      existingPayslipId,
    });

    matched.push(item);
    if (existingPayslipId) {
      duplicates.push(item);
    }
  });

  return {
    fileName,
    payPeriods: [...payPeriodSet].sort(),
    totalRows: matched.length + unmatched.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    duplicateCount: duplicates.length,
    matched,
    unmatched,
    duplicates,
  };
}

export async function previewPayslipCsvImport(
  csvContent: string,
  fileName: string,
): Promise<PayslipImportPreview> {
  return buildImportPreview(csvContent, fileName);
}

export async function confirmPayslipCsvImport(input: {
  csvContent: string;
  fileName: string;
  importedById: string;
  importedByName: string;
}): Promise<PayslipImportResult> {
  const csvRows = parsePayrollCsvContent(input.csvContent);
  const employees = await prisma.employee.findMany();
  const importedAt = new Date();

  let recordsImported = 0;
  let recordsUpdated = 0;
  const unmatchedEmployees: string[] = [];

  for (let index = 0; index < csvRows.length; index += 1) {
    const parsed = parseCsvRow(csvRows[index], index + 1);
    if (!parsed) {
      continue;
    }

    const employee = matchEmployee(parsed, employees);
    if (!employee) {
      unmatchedEmployees.push(unmatchedLabel(parsed));
      continue;
    }

    const data = payslipDataFromRow(parsed, employee, importedAt);
    const existing = await prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        payPeriod: parsed.payPeriod,
      },
    });

    if (existing) {
      await prisma.payslip.update({
        where: { id: existing.id },
        data,
      });
      recordsUpdated += 1;
    } else {
      await prisma.payslip.create({ data });
      recordsImported += 1;
    }
  }

  const archived = await applyPayslipRetention(importedAt);
  const uniqueUnmatched = [...new Set(unmatchedEmployees)];

  const auditLog = await prisma.payslipImportLog.create({
    data: {
      importedById: input.importedById,
      importedByName: input.importedByName,
      fileName: input.fileName,
      recordsImported,
      recordsUpdated,
      recordsSkipped: uniqueUnmatched.length,
      unmatchedEmployees: uniqueUnmatched,
    },
  });

  return {
    recordsImported,
    recordsUpdated,
    recordsSkipped: uniqueUnmatched.length,
    unmatchedEmployees: uniqueUnmatched,
    archived,
    auditLogId: auditLog.id,
  };
}

export async function listPayslipImportAuditLogs(
  limit = 20,
): Promise<PayslipImportAuditDto[]> {
  const rows = await prisma.payslipImportLog.findMany({
    orderBy: { importedAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    importedByName: row.importedByName,
    importedAt: row.importedAt.toISOString(),
    fileName: row.fileName,
    recordsImported: row.recordsImported,
    recordsUpdated: row.recordsUpdated,
    recordsSkipped: row.recordsSkipped,
    unmatchedEmployees: Array.isArray(row.unmatchedEmployees)
      ? (row.unmatchedEmployees as string[])
      : [],
  }));
}
