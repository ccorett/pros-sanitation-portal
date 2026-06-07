import { Prisma, type Employee } from "@prisma/client";
import { readPayrollSheetRows, type GoogleSheetRow } from "@/lib/google-sheets-client";
import {
  normalizePayPeriod,
  shouldArchivePayPeriod,
} from "@/lib/payslip-pay-period";
import { prisma } from "@/lib/prisma";

export type PayslipSyncResult = {
  imported: number;
  updated: number;
  unmatched: string[];
  archived: number;
};

type ParsedSheetPayslip = {
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

const SHEET_FIELD_ALIASES: Record<keyof Omit<ParsedSheetPayslip, "payPeriod">, string[]> = {
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

function pickSheetValue(row: GoogleSheetRow, aliases: string[]): string {
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

function parseSheetRow(row: GoogleSheetRow): ParsedSheetPayslip | null {
  const employeeName = pickSheetValue(row, SHEET_FIELD_ALIASES.employeeName);
  const email = pickSheetValue(row, SHEET_FIELD_ALIASES.email).toLowerCase();
  const payPeriodRaw =
    pickSheetValue(row, ["pay period", "period"]) ||
    row["sheet name"]?.trim() ||
    "";

  if (!employeeName && !email) {
    return null;
  }

  if (!payPeriodRaw) {
    return null;
  }

  return {
    employeeName,
    email,
    payPeriod: normalizePayPeriod(payPeriodRaw),
    grossPay: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.grossPay)),
    healthSurcharge: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.healthSurcharge)),
    nis: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.nis)),
    paye: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.paye)),
    companyDeductions: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.companyDeductions)),
    netPay: parseMoney(pickSheetValue(row, SHEET_FIELD_ALIASES.netPay)),
    grossPayDetails: pickSheetValue(row, SHEET_FIELD_ALIASES.grossPayDetails) || null,
    companyDeductionDetails:
      pickSheetValue(row, SHEET_FIELD_ALIASES.companyDeductionDetails) || null,
  };
}

function normalizeEmployeeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function employeeDisplayName(employee: Pick<Employee, "firstName" | "lastName">): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

function matchEmployee(
  row: ParsedSheetPayslip,
  employees: Employee[],
): Employee | null {
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

function unmatchedLabel(row: ParsedSheetPayslip): string {
  if (row.email) {
    return row.email;
  }
  return row.employeeName || "Unknown row";
}

function payslipDataFromRow(
  row: ParsedSheetPayslip,
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
    source: "google_sheet",
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

export async function syncPayslipsFromGoogleSheet(): Promise<PayslipSyncResult> {
  const sheetRows = await readPayrollSheetRows();
  const employees = await prisma.employee.findMany();
  const importedAt = new Date();

  let imported = 0;
  let updated = 0;
  const unmatched: string[] = [];

  for (const sheetRow of sheetRows) {
    const parsed = parseSheetRow(sheetRow);
    if (!parsed) {
      continue;
    }

    const employee = matchEmployee(parsed, employees);
    if (!employee) {
      unmatched.push(unmatchedLabel(parsed));
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
      updated += 1;
    } else {
      await prisma.payslip.create({ data });
      imported += 1;
    }
  }

  const archived = await applyPayslipRetention(importedAt);

  return {
    imported,
    updated,
    unmatched: [...new Set(unmatched)],
    archived,
  };
}
