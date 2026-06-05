import { AccessLevel, OperationalGroup, type Employee } from "@prisma/client";
import type { VacationRequest } from "@/lib/hr-mock-data";
import { canSupervisorReviewEmployeeVacation } from "@/lib/supervisor-team-scope";

export type VacationWorkflowStatus =
  | "Pending Supervisor Review"
  | "Pending Manager Review"
  | "Approved"
  | "Rejected";

export type SupervisorAwarenessStatus = "Agree" | "Disagree";

export type VacationWorkflowRequest = VacationRequest & {
  workflowStatus: VacationWorkflowStatus;
  locationAssignment: string;
  employeeEmail: string;
  employeeName: string;
  employeeOperationalGroup: OperationalGroup;
  supervisorEmail: string;
  supervisorAwareness: SupervisorAwarenessStatus | null;
  supervisorNotes: string | null;
};

export const DEMO_VACATION_REQUEST_ID = "vac-demo-team-member-001";

export const DEMO_VACATION_REQUEST: VacationWorkflowRequest = {
  id: DEMO_VACATION_REQUEST_ID,
  startDate: "2026-06-10",
  endDate: "2026-06-12",
  reason: "Family appointment",
  status: "Pending",
  submittedAt: "2026-06-01T09:00:00.000Z",
  workflowStatus: "Pending Supervisor Review",
  locationAssignment: "Scarborough Pennysaver Grocery",
  employeeEmail: "team.member@prossanitation.com",
  employeeName: "Team Member",
  employeeOperationalGroup: OperationalGroup.GENERAL,
  supervisorEmail: "supervisor@prossanitation.com",
  supervisorAwareness: null,
  supervisorNotes: null,
};

export function resolveSupervisorEmailForSubmit(employee: {
  operationalGroup: OperationalGroup;
  locationAssignment: string | null;
}): string {
  if (employee.operationalGroup === OperationalGroup.BIN_TECHNICIAN) {
    return "bin.supervisor@prossanitation.com";
  }

  return "supervisor@prossanitation.com";
}

export function canSupervisorReviewRequest(
  supervisor: Pick<
    Employee,
    "accessLevel" | "operationalGroup" | "locationAssignment"
  >,
  request: Pick<
    VacationWorkflowRequest,
    | "employeeOperationalGroup"
    | "locationAssignment"
    | "workflowStatus"
  >,
): boolean {
  if (request.workflowStatus !== "Pending Supervisor Review") {
    return false;
  }

  return canSupervisorReviewEmployeeVacation(supervisor, {
    accessLevel: AccessLevel.TEAM_MEMBER,
    operationalGroup: request.employeeOperationalGroup,
    locationAssignment: request.locationAssignment,
  });
}

export function workflowStatusClass(
  status: VacationWorkflowStatus | string,
): string {
  if (status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (status === "Pending Manager Review") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function getServerVacationSeedForEmployee(
  employee: Pick<Employee, "companyEmail">,
): VacationWorkflowRequest[] | undefined {
  if (employee.companyEmail === DEMO_VACATION_REQUEST.employeeEmail) {
    return [DEMO_VACATION_REQUEST];
  }
  return undefined;
}

export function toWorkflowRequest(
  request: VacationRequest,
  meta: {
    employeeEmail: string;
    employeeName: string;
    locationAssignment: string;
    operationalGroup: OperationalGroup;
    supervisorEmail?: string;
  },
): VacationWorkflowRequest {
  const workflow = request as Partial<VacationWorkflowRequest>;

  return {
    ...request,
    workflowStatus:
      workflow.workflowStatus ?? "Pending Supervisor Review",
    locationAssignment:
      workflow.locationAssignment ?? meta.locationAssignment,
    employeeEmail: workflow.employeeEmail ?? meta.employeeEmail,
    employeeName: workflow.employeeName ?? meta.employeeName,
    employeeOperationalGroup:
      workflow.employeeOperationalGroup ?? meta.operationalGroup,
    supervisorEmail:
      workflow.supervisorEmail ??
      meta.supervisorEmail ??
      resolveSupervisorEmailForSubmit({
        operationalGroup: meta.operationalGroup,
        locationAssignment: meta.locationAssignment,
      }),
    supervisorAwareness: workflow.supervisorAwareness ?? null,
    supervisorNotes: workflow.supervisorNotes ?? null,
  };
}
