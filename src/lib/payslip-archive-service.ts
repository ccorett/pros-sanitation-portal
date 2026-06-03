import type { Employee, Payslip } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PayslipArchiveDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  payPeriod: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: string;
};

function serializePayslip(
  row: Payslip,
  employeeName?: string,
): PayslipArchiveDto {
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeName: employeeName ?? "",
    payPeriod: row.payPeriod,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export async function listPayslipsForEmployee(
  employeeId: string,
): Promise<PayslipArchiveDto[]> {
  const rows = await prisma.payslip.findMany({
    where: { employeeId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map((row) => serializePayslip(row));
}

export async function listAllPayslipsForAdmin(): Promise<PayslipArchiveDto[]> {
  const rows = await prisma.payslip.findMany({
    include: {
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return rows.map((row) =>
    serializePayslip(
      row,
      `${row.employee.firstName} ${row.employee.lastName}`.trim(),
    ),
  );
}

export async function getPayslipForEmployee(
  payslipId: string,
  employeeId: string,
): Promise<Payslip | null> {
  return prisma.payslip.findFirst({
    where: { id: payslipId, employeeId },
  });
}

export async function getPayslipById(payslipId: string): Promise<Payslip | null> {
  return prisma.payslip.findUnique({ where: { id: payslipId } });
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
    select: { firstName: true, lastName: true },
  });

  if (!employee) {
    throw new Error("Employee not found.");
  }

  const row = await prisma.payslip.create({
    data: {
      employeeId: input.employeeId,
      payPeriod: input.payPeriod.trim(),
      fileName: input.fileName.trim(),
      fileUrl: input.fileUrl.trim(),
      uploadedBy: input.uploadedBy.trim(),
    },
  });

  return serializePayslip(
    row,
    `${employee.firstName} ${employee.lastName}`.trim(),
  );
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

  return serializePayslip(
    row,
    `${row.employee.firstName} ${row.employee.lastName}`.trim(),
  );
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
