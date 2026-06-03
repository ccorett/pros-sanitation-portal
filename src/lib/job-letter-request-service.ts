import type { Employee, JobLetterRequest } from "@prisma/client";
import {
  JobLetterRequestStatus,
  JobLetterType,
} from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";

export type JobLetterRequestDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  letterType: JobLetterType;
  letterTypeLabel: string;
  notes: string | null;
  status: JobLetterRequestStatus;
  statusLabel: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  decisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

const LETTER_TYPE_LABELS: Record<JobLetterType, string> = {
  JOB_LETTER: "Job Letter",
  EMPLOYMENT_LETTER: "Employment Letter",
  SALARY_LETTER: "Salary Letter",
};

const STATUS_LABELS: Record<JobLetterRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function mapUiLetterTypeToJobLetterType(letterType: string): JobLetterType {
  switch (letterType.trim()) {
    case "Employment Letter":
      return JobLetterType.EMPLOYMENT_LETTER;
    case "Salary Letter":
      return JobLetterType.SALARY_LETTER;
    case "Job Letter":
    default:
      return JobLetterType.JOB_LETTER;
  }
}

export function serializeJobLetterRequest(
  request: JobLetterRequest,
): JobLetterRequestDto {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    employeeEmail: request.employeeEmail,
    letterType: request.letterType,
    letterTypeLabel: LETTER_TYPE_LABELS[request.letterType],
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

export async function listJobLetterRequestsForActor(
  actor: Employee,
): Promise<JobLetterRequestDto[]> {
  const where =
    isManagerOrAbove(actor.accessLevel) ||
    canAccessAdminModule(actor.accessLevel)
      ? {}
      : { employeeId: actor.id };

  const rows = await prisma.jobLetterRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializeJobLetterRequest);
}

export type CreateJobLetterRequestInput = {
  letterType: string;
  notes?: string | null;
  requester: Employee;
};

export async function createJobLetterRequest(
  input: CreateJobLetterRequestInput,
): Promise<JobLetterRequestDto> {
  const notes = input.notes?.trim() || null;
  const letterType = mapUiLetterTypeToJobLetterType(input.letterType);
  const requesterName =
    `${input.requester.firstName} ${input.requester.lastName}`.trim();

  const created = await prisma.jobLetterRequest.create({
    data: {
      employeeId: input.requester.id,
      employeeName: requesterName,
      employeeEmail: input.requester.companyEmail,
      letterType,
      notes,
    },
  });

  return serializeJobLetterRequest(created);
}

export type ReviewJobLetterRequestInput = {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  reviewer: Employee;
  decisionNotes?: string | null;
};

export async function reviewJobLetterRequest(
  input: ReviewJobLetterRequestInput,
): Promise<JobLetterRequestDto> {
  const existing = await prisma.jobLetterRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!existing) {
    throw new Error("Job letter request not found.");
  }

  if (existing.status !== JobLetterRequestStatus.PENDING) {
    throw new Error("Only pending requests can be approved or rejected.");
  }

  const status =
    input.status === "APPROVED"
      ? JobLetterRequestStatus.APPROVED
      : JobLetterRequestStatus.REJECTED;

  const reviewerName =
    `${input.reviewer.firstName} ${input.reviewer.lastName}`.trim();

  const updated = await prisma.jobLetterRequest.update({
    where: { id: existing.id },
    data: {
      status,
      reviewedById: input.reviewer.id,
      reviewedByName: reviewerName,
      reviewedAt: new Date(),
      decisionNotes: input.decisionNotes?.trim() || null,
    },
  });

  return serializeJobLetterRequest(updated);
}

export const DEMO_JOB_LETTER_REQUEST_ID = "letter-demo-team-member-001";

export async function seedDemoJobLetterRequest(teamMember: Employee) {
  await prisma.jobLetterRequest.upsert({
    where: { id: DEMO_JOB_LETTER_REQUEST_ID },
    update: {
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      letterType: JobLetterType.EMPLOYMENT_LETTER,
      notes: "Bank account opening",
      status: JobLetterRequestStatus.PENDING,
      reviewedById: null,
      reviewedByName: null,
      reviewedAt: null,
      decisionNotes: null,
    },
    create: {
      id: DEMO_JOB_LETTER_REQUEST_ID,
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      letterType: JobLetterType.EMPLOYMENT_LETTER,
      notes: "Bank account opening",
    },
  });
}
