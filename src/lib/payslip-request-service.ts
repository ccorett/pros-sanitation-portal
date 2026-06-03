import type { Employee, PayslipRequest } from "@prisma/client";
import { PayslipRequestStatus } from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type PayslipRequestDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  payPeriod: string;
  notes: string | null;
  status: PayslipRequestStatus;
  statusLabel: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  decisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<PayslipRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function serializePayslipRequest(
  request: PayslipRequest,
): PayslipRequestDto {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    employeeEmail: request.employeeEmail,
    payPeriod: request.payPeriod,
    notes: request.notes,
    status: request.status,
    statusLabel: STATUS_LABELS[request.status],
    reviewedById: request.reviewedById,
    reviewedByName: request.reviewedByName,
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    decisionNotes: request.decisionNotes,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export async function listPayslipRequestsForActor(
  actor: Employee,
): Promise<PayslipRequestDto[]> {
  const where =
    isManagerOrAbove(actor.accessLevel) ||
    canAccessAdminModule(actor.accessLevel)
      ? {}
      : { employeeId: actor.id };

  const rows = await prisma.payslipRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializePayslipRequest);
}

export type CreatePayslipRequestInput = {
  payPeriod: string;
  notes?: string | null;
  requester: Employee;
};

export async function createPayslipRequest(
  input: CreatePayslipRequestInput,
): Promise<PayslipRequestDto> {
  const payPeriod = input.payPeriod.trim();
  if (!payPeriod) {
    throw new Error("Pay period is required.");
  }

  const notes = input.notes?.trim() || null;
  const requesterName =
    `${input.requester.firstName} ${input.requester.lastName}`.trim();

  const created = await prisma.payslipRequest.create({
    data: {
      employeeId: input.requester.id,
      employeeName: requesterName,
      employeeEmail: input.requester.companyEmail,
      payPeriod,
      notes,
    },
  });

  return serializePayslipRequest(created);
}

export type ReviewPayslipRequestInput = {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  reviewer: Employee;
  decisionNotes?: string | null;
};

export async function reviewPayslipRequest(
  input: ReviewPayslipRequestInput,
): Promise<PayslipRequestDto> {
  const existing = await prisma.payslipRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!existing) {
    throw new Error("Payslip request not found.");
  }

  if (existing.status !== PayslipRequestStatus.PENDING) {
    throw new Error("Only pending requests can be approved or rejected.");
  }

  const status =
    input.status === "APPROVED"
      ? PayslipRequestStatus.APPROVED
      : PayslipRequestStatus.REJECTED;

  const reviewerName =
    `${input.reviewer.firstName} ${input.reviewer.lastName}`.trim();

  const updated = await prisma.payslipRequest.update({
    where: { id: existing.id },
    data: {
      status,
      reviewedById: input.reviewer.id,
      reviewedByName: reviewerName,
      reviewedAt: new Date(),
      decisionNotes: input.decisionNotes?.trim() || null,
    },
  });

  return serializePayslipRequest(updated);
}

export const DEMO_PAYSLIP_REQUEST_ID = "payslip-demo-team-member-001";

export async function seedDemoPayslipRequest(teamMember: Employee) {
  await prisma.payslipRequest.upsert({
    where: { id: DEMO_PAYSLIP_REQUEST_ID },
    update: {
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      payPeriod: "March 2026",
      notes: "Duplicate payslip copy for records",
      status: PayslipRequestStatus.PENDING,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      decisionNotes: null,
    },
    create: {
      id: DEMO_PAYSLIP_REQUEST_ID,
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      payPeriod: "March 2026",
      notes: "Duplicate payslip copy for records",
    },
  });
}
