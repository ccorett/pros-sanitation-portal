import type { Employee, VacationRequest } from "@prisma/client";
import {
  AccessLevel,
  OperationalGroup,
  VacationFinalStatus,
  VacationManagerStatus,
  VacationSupervisorStatus,
} from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { isManagerOrAbove } from "@/lib/operational-access";
import { prisma } from "@/lib/prisma";
import { getSupervisorVisibleEmployeeIds } from "@/lib/supervisor-team-scope";
import { resolveSupervisorEmailForSubmit } from "@/lib/vacation-workflow";

export type VacationRequestDto = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  locationAssignment: string;
  supervisorId: string | null;
  supervisorName: string | null;
  startDate: string;
  endDate: string;
  reason: string;
  supervisorStatus: VacationSupervisorStatus;
  supervisorStatusLabel: string;
  supervisorNotes: string | null;
  supervisorReviewedAt: string | null;
  managerStatus: VacationManagerStatus;
  managerStatusLabel: string;
  managerNotes: string | null;
  managerReviewedById: string | null;
  managerReviewedByName: string | null;
  managerReviewedAt: string | null;
  finalStatus: VacationFinalStatus;
  finalStatusLabel: string;
  createdAt: string;
  updatedAt: string;
};

export const SUPERVISOR_STATUS_LABELS: Record<VacationSupervisorStatus, string> = {
  PENDING: "Pending",
  AWARE: "Agree",
  UNAWARE: "Disagree",
};

export const MANAGER_STATUS_LABELS: Record<VacationManagerStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const FINAL_STATUS_LABELS: Record<VacationFinalStatus, string> = {
  PENDING_SUPERVISOR_REVIEW: "Pending Supervisor Review",
  PENDING_MANAGER_REVIEW: "Pending Manager Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializeVacationRequest(
  request: VacationRequest,
): VacationRequestDto {
  return {
    id: request.id,
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    employeeEmail: request.employeeEmail,
    locationAssignment: request.locationAssignment,
    supervisorId: request.supervisorId,
    supervisorName: request.supervisorName,
    startDate: formatDateOnly(request.startDate),
    endDate: formatDateOnly(request.endDate),
    reason: request.reason,
    supervisorStatus: request.supervisorStatus,
    supervisorStatusLabel: SUPERVISOR_STATUS_LABELS[request.supervisorStatus],
    supervisorNotes: request.supervisorNotes,
    supervisorReviewedAt: request.supervisorReviewedAt?.toISOString() ?? null,
    managerStatus: request.managerStatus,
    managerStatusLabel: MANAGER_STATUS_LABELS[request.managerStatus],
    managerNotes: request.managerNotes,
    managerReviewedById: request.managerReviewedById,
    managerReviewedByName: request.managerReviewedByName,
    managerReviewedAt: request.managerReviewedAt?.toISOString() ?? null,
    finalStatus: request.finalStatus,
    finalStatusLabel: FINAL_STATUS_LABELS[request.finalStatus],
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function parseDateInput(value: string): Date {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }
  return new Date(`${trimmed}T12:00:00.000Z`);
}

async function resolveSupervisorForEmployee(employee: Employee) {
  const supervisorEmail = resolveSupervisorEmailForSubmit({
    operationalGroup: employee.operationalGroup,
    locationAssignment: employee.locationAssignment,
  });

  const supervisor = await prisma.employee.findFirst({
    where: { companyEmail: supervisorEmail },
  });

  if (!supervisor) {
    return { supervisorId: null, supervisorName: null };
  }

  return {
    supervisorId: supervisor.id,
    supervisorName: `${supervisor.firstName} ${supervisor.lastName}`.trim(),
  };
}

export async function listVacationRequestsForActor(
  actor: Employee,
): Promise<VacationRequestDto[]> {
  let where: { employeeId?: string | { in: string[] } } = {};

  if (
    isManagerOrAbove(actor.accessLevel) ||
    canAccessAdminModule(actor.accessLevel)
  ) {
    where = {};
  } else if (actor.accessLevel === AccessLevel.SUPERVISOR) {
    const employeeIds = await getSupervisorVisibleEmployeeIds(actor);
    where = { employeeId: { in: employeeIds } };
  } else {
    where = { employeeId: actor.id };
  }

  const rows = await prisma.vacationRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializeVacationRequest);
}

export async function canSupervisorActOnRequest(
  supervisor: Employee,
  request: VacationRequest,
): Promise<boolean> {
  if (supervisor.accessLevel !== AccessLevel.SUPERVISOR) {
    return false;
  }

  if (request.finalStatus !== VacationFinalStatus.PENDING_SUPERVISOR_REVIEW) {
    return false;
  }

  if (!request.supervisorId || request.supervisorId !== supervisor.id) {
    return false;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: request.employeeId },
    select: { operationalGroup: true, locationAssignment: true },
  });

  if (!employee) {
    return false;
  }

  if (supervisor.operationalGroup === OperationalGroup.BIN_SERVICE_SUPERVISOR) {
    return (
      employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN &&
      Boolean(supervisor.locationAssignment) &&
      supervisor.locationAssignment === employee.locationAssignment
    );
  }

  if (supervisor.operationalGroup === OperationalGroup.GENERAL) {
    return (
      employee.operationalGroup !== OperationalGroup.BIN_TECHNICIAN &&
      Boolean(supervisor.locationAssignment) &&
      supervisor.locationAssignment === request.locationAssignment
    );
  }

  return false;
}

export type CreateVacationRequestInput = {
  startDate: string;
  endDate: string;
  reason: string;
  requester: Employee;
};

export async function createVacationRequest(
  input: CreateVacationRequestInput,
): Promise<VacationRequestDto> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("Reason is required.");
  }

  const locationAssignment = input.requester.locationAssignment?.trim();
  if (!locationAssignment) {
    throw new Error(
      "Location assignment is required before submitting vacation requests.",
    );
  }

  const startDate = parseDateInput(input.startDate);
  const endDate = parseDateInput(input.endDate);

  if (endDate < startDate) {
    throw new Error("End date must be on or after the start date.");
  }

  const { supervisorId, supervisorName } =
    await resolveSupervisorForEmployee(input.requester);

  const requesterName =
    `${input.requester.firstName} ${input.requester.lastName}`.trim();

  const created = await prisma.vacationRequest.create({
    data: {
      employeeId: input.requester.id,
      employeeName: requesterName,
      employeeEmail: input.requester.companyEmail,
      locationAssignment,
      supervisorId,
      supervisorName,
      startDate,
      endDate,
      reason,
    },
  });

  return serializeVacationRequest(created);
}

export type SupervisorVacationAction = "AWARE" | "UNAWARE";

export async function supervisorReviewVacationRequest(input: {
  requestId: string;
  action: SupervisorVacationAction;
  supervisorNotes?: string | null;
  supervisor: Employee;
}): Promise<VacationRequestDto> {
  const existing = await prisma.vacationRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!existing) {
    throw new Error("Vacation request not found.");
  }

  if (!(await canSupervisorActOnRequest(input.supervisor, existing))) {
    throw new Error("You are not allowed to review this vacation request.");
  }

  const supervisorStatus =
    input.action === "AWARE"
      ? VacationSupervisorStatus.AWARE
      : VacationSupervisorStatus.UNAWARE;

  const updated = await prisma.vacationRequest.update({
    where: { id: existing.id },
    data: {
      supervisorStatus,
      supervisorNotes: input.supervisorNotes?.trim() || null,
      supervisorReviewedAt: new Date(),
      finalStatus: VacationFinalStatus.PENDING_MANAGER_REVIEW,
    },
  });

  return serializeVacationRequest(updated);
}

export type ManagerVacationAction = "APPROVED" | "REJECTED";

export async function managerReviewVacationRequest(input: {
  requestId: string;
  action: ManagerVacationAction;
  managerNotes?: string | null;
  reviewer: Employee;
}): Promise<VacationRequestDto> {
  const existing = await prisma.vacationRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!existing) {
    throw new Error("Vacation request not found.");
  }

  if (existing.finalStatus !== VacationFinalStatus.PENDING_MANAGER_REVIEW) {
    throw new Error("This request is not waiting for manager review.");
  }

  const managerStatus =
    input.action === "APPROVED"
      ? VacationManagerStatus.APPROVED
      : VacationManagerStatus.REJECTED;

  const finalStatus =
    input.action === "APPROVED"
      ? VacationFinalStatus.APPROVED
      : VacationFinalStatus.REJECTED;

  const reviewerName =
    `${input.reviewer.firstName} ${input.reviewer.lastName}`.trim();

  const updated = await prisma.vacationRequest.update({
    where: { id: existing.id },
    data: {
      managerStatus,
      managerNotes: input.managerNotes?.trim() || null,
      managerReviewedById: input.reviewer.id,
      managerReviewedByName: reviewerName,
      managerReviewedAt: new Date(),
      finalStatus,
    },
  });

  return serializeVacationRequest(updated);
}

export const DEMO_VACATION_REQUEST_ID = "vac-demo-team-member-001";

export async function seedDemoVacationRequest(teamMember: Employee) {
  const supervisorEmail = resolveSupervisorEmailForSubmit({
    operationalGroup: teamMember.operationalGroup,
    locationAssignment: teamMember.locationAssignment,
  });

  const supervisor = await prisma.employee.findFirst({
    where: { companyEmail: supervisorEmail },
  });

  await prisma.vacationRequest.upsert({
    where: { id: DEMO_VACATION_REQUEST_ID },
    update: {
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      locationAssignment:
        teamMember.locationAssignment ?? "Scarborough Pennysaver Grocery",
      supervisorId: supervisor?.id ?? null,
      supervisorName: supervisor
        ? `${supervisor.firstName} ${supervisor.lastName}`.trim()
        : null,
      startDate: new Date("2026-06-10T12:00:00.000Z"),
      endDate: new Date("2026-06-12T12:00:00.000Z"),
      reason: "Family appointment",
      supervisorStatus: VacationSupervisorStatus.PENDING,
      supervisorNotes: null,
      supervisorReviewedAt: null,
      managerStatus: VacationManagerStatus.PENDING,
      managerNotes: null,
      managerReviewedById: null,
      managerReviewedByName: null,
      managerReviewedAt: null,
      finalStatus: VacationFinalStatus.PENDING_SUPERVISOR_REVIEW,
    },
    create: {
      id: DEMO_VACATION_REQUEST_ID,
      employeeId: teamMember.id,
      employeeName: `${teamMember.firstName} ${teamMember.lastName}`.trim(),
      employeeEmail: teamMember.companyEmail,
      locationAssignment:
        teamMember.locationAssignment ?? "Scarborough Pennysaver Grocery",
      supervisorId: supervisor?.id ?? null,
      supervisorName: supervisor
        ? `${supervisor.firstName} ${supervisor.lastName}`.trim()
        : null,
      startDate: new Date("2026-06-10T12:00:00.000Z"),
      endDate: new Date("2026-06-12T12:00:00.000Z"),
      reason: "Family appointment",
    },
  });
}
