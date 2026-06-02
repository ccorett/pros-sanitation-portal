import type {
  JobLetterRequest,
  JobLetterRequestStatus,
  VacationRequestStatus,
} from "@/lib/hr-mock-data";
import {
  getJobLetterRequests,
  getVacationRequests,
  saveJobLetterRequests,
  saveVacationRequests,
} from "@/lib/hr-client-storage";
import { appendEditHistory } from "@/lib/platform-edit-history";
import { OperationalGroup } from "@prisma/client";
import {
  DEMO_VACATION_REQUEST,
  DEMO_VACATION_REQUEST_ID,
  type SupervisorAwarenessStatus,
  type VacationWorkflowRequest,
  type VacationWorkflowStatus,
} from "@/lib/vacation-workflow";

export type AdminHrRecord = {
  id: string;
  requestType: "Vacation Requests" | "Job Letter Requests" | "Payslip Requests";
  employee: string;
  employeeId: string;
  employeeEmail?: string;
  details: string;
  dateSubmitted: string;
  status: VacationRequestStatus | JobLetterRequestStatus;
  workflowStatus?: VacationWorkflowStatus;
  locationAssignment?: string;
  supervisorEmail?: string;
  employeeOperationalGroup?: OperationalGroup;
  supervisorAwareness?: SupervisorAwarenessStatus | null;
  supervisorNotes?: string | null;
  startDate?: string;
  endDate?: string;
  reason?: string;
  lastEdited?: string;
  lastEditedAt?: string;
  editedBy?: string;
};

const HR_ADMIN_PREFIX = "pros-platform-hr-admin:";

const seedHrAdminRecords: AdminHrRecord[] = [
  {
    id: DEMO_VACATION_REQUEST_ID,
    requestType: "Vacation Requests",
    employee: DEMO_VACATION_REQUEST.employeeName,
    employeeId: "team-member-demo",
    employeeEmail: DEMO_VACATION_REQUEST.employeeEmail,
    details: "Jun 10–12 · Family appointment",
    dateSubmitted: "2026-06-01",
    status: "Pending",
    workflowStatus: "Pending Supervisor Review",
    locationAssignment: DEMO_VACATION_REQUEST.locationAssignment,
    supervisorEmail: DEMO_VACATION_REQUEST.supervisorEmail,
    employeeOperationalGroup: DEMO_VACATION_REQUEST.employeeOperationalGroup,
    supervisorAwareness: null,
    supervisorNotes: null,
    startDate: DEMO_VACATION_REQUEST.startDate,
    endDate: DEMO_VACATION_REQUEST.endDate,
    reason: DEMO_VACATION_REQUEST.reason,
    lastEdited: "2026-06-01",
    lastEditedAt: DEMO_VACATION_REQUEST.submittedAt,
    editedBy: DEMO_VACATION_REQUEST.employeeName,
  },
  {
    id: "letter-seed-001",
    requestType: "Job Letter Requests",
    employee: "Jordan Mitchell",
    employeeId: "emp-demo-001",
    details: "Employment Letter · Bank account opening",
    dateSubmitted: "2026-04-12",
    status: "Approved",
    lastEdited: "2026-04-15",
    lastEditedAt: "2026-04-15T09:00:00.000Z",
    editedBy: "Admin User",
  },
];

function readHrRecords(): AdminHrRecord[] {
  if (typeof window === "undefined") return seedHrAdminRecords;
  const raw = localStorage.getItem(HR_ADMIN_PREFIX);
  if (!raw) return seedHrAdminRecords;
  try {
    const parsed = JSON.parse(raw) as AdminHrRecord[];
    const records = Array.isArray(parsed) ? parsed : seedHrAdminRecords;
    if (!records.some((row) => row.id === DEMO_VACATION_REQUEST_ID)) {
      return [seedHrAdminRecords[0], ...records];
    }
    return records;
  } catch {
    return seedHrAdminRecords;
  }
}

function saveHrRecords(records: AdminHrRecord[]) {
  localStorage.setItem(HR_ADMIN_PREFIX, JSON.stringify(records));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pros-platform-data-updated"));
  }
}

export function getAdminHrRecords(): AdminHrRecord[] {
  return readHrRecords();
}

export function getVacationWorkflowRecords(): VacationWorkflowRequest[] {
  return readHrRecords()
    .filter((row) => row.requestType === "Vacation Requests")
    .map(adminRecordToWorkflow);
}

function adminRecordToWorkflow(record: AdminHrRecord): VacationWorkflowRequest {
  return {
    id: record.id,
    startDate: record.startDate ?? record.details.split("–")[0]?.trim() ?? "",
    endDate: record.endDate ?? "",
    reason: record.reason ?? record.details.split("·").pop()?.trim() ?? "",
    status: record.status as VacationRequestStatus,
    submittedAt: record.lastEditedAt ?? record.dateSubmitted,
    workflowStatus: record.workflowStatus ?? "Pending Supervisor Review",
    locationAssignment: record.locationAssignment ?? "",
    employeeEmail: record.employeeEmail ?? "",
    employeeName: record.employee,
    employeeOperationalGroup:
      record.employeeOperationalGroup ?? OperationalGroup.GENERAL,
    supervisorEmail: record.supervisorEmail ?? "",
    supervisorAwareness: record.supervisorAwareness ?? null,
    supervisorNotes: record.supervisorNotes ?? null,
  };
}

function syncStatusToEmployeeView(record: AdminHrRecord, status: AdminHrRecord["status"]) {
  if (record.requestType === "Vacation Requests") {
    const requests = getVacationRequests(record.employeeId).map((row) =>
      row.id === record.id ? { ...row, status: status as VacationRequestStatus } : row,
    );
    saveVacationRequests(record.employeeId, requests);
  }
  if (record.requestType === "Job Letter Requests") {
    const requests = getJobLetterRequests(record.employeeId).map((row) =>
      row.id === record.id ? { ...row, status: status as JobLetterRequestStatus } : row,
    );
    saveJobLetterRequests(record.employeeId, requests);
  }
}

function syncWorkflowToEmployeeView(record: AdminHrRecord) {
  if (record.requestType !== "Vacation Requests") return;
  const workflow = adminRecordToWorkflow(record);
  const requests = getVacationRequests(record.employeeId).map((row) =>
    row.id === record.id ? { ...row, ...workflow } : row,
  );
  saveVacationRequests(record.employeeId, requests);
}

export function updateAdminHrStatus(
  id: string,
  status: VacationRequestStatus | JobLetterRequestStatus,
  editedBy: string,
) {
  const records = readHrRecords().map((record) => {
    if (record.id !== id) return record;
    const previous = record.status;
    appendEditHistory({
      recordId: id,
      section: "Human Resources",
      recordName: `${record.employee} — ${record.requestType}`,
      actionType: "Status Change",
      previousValue: previous,
      newValue: status,
      editedBy,
      notes: record.details,
    });
    const updated = {
      ...record,
      status,
      lastEdited: new Date().toISOString().slice(0, 10),
      lastEditedAt: new Date().toISOString(),
      editedBy,
    };
    syncStatusToEmployeeView(updated, status);
    return updated;
  });
  saveHrRecords(records);
  return records;
}

export function markSupervisorVacationAwareness(input: {
  requestId: string;
  awareness: SupervisorAwarenessStatus;
  supervisorNotes: string;
  editedBy: string;
}): AdminHrRecord[] {
  const records = readHrRecords().map((record) => {
    if (record.id !== input.requestId) return record;
    if (record.workflowStatus !== "Pending Supervisor Review") return record;

    const updated: AdminHrRecord = {
      ...record,
      workflowStatus: "Pending Manager Review",
      supervisorAwareness: input.awareness,
      supervisorNotes: input.supervisorNotes.trim(),
      lastEdited: new Date().toISOString().slice(0, 10),
      lastEditedAt: new Date().toISOString(),
      editedBy: input.editedBy,
    };
    syncWorkflowToEmployeeView(updated);
    return updated;
  });
  saveHrRecords(records);
  return records;
}

export function managerDecideVacationRequest(input: {
  requestId: string;
  decision: "Approved" | "Rejected";
  editedBy: string;
}): AdminHrRecord[] {
  const records = readHrRecords().map((record) => {
    if (record.id !== input.requestId) return record;
    if (record.workflowStatus !== "Pending Manager Review") return record;

    const updated: AdminHrRecord = {
      ...record,
      workflowStatus: input.decision,
      status: input.decision,
      lastEdited: new Date().toISOString().slice(0, 10),
      lastEditedAt: new Date().toISOString(),
      editedBy: input.editedBy,
    };
    syncStatusToEmployeeView(updated, input.decision);
    syncWorkflowToEmployeeView(updated);
    return updated;
  });
  saveHrRecords(records);
  return records;
}

/** Sync employee vacation submit into platform HR store (single source). */
export function upsertVacationFromEmployee(
  employeeId: string,
  employeeName: string,
  request: VacationWorkflowRequest,
) {
  const records = readHrRecords();
  const existing = records.find((r) => r.id === request.id);
  const row: AdminHrRecord = {
    id: request.id,
    requestType: "Vacation Requests",
    employee: employeeName,
    employeeId,
    employeeEmail: request.employeeEmail,
    details: `${request.startDate} – ${request.endDate} · ${request.reason}`,
    dateSubmitted: request.submittedAt.slice(0, 10),
    status: request.status,
    workflowStatus: request.workflowStatus,
    locationAssignment: request.locationAssignment,
    supervisorEmail: request.supervisorEmail,
    employeeOperationalGroup: request.employeeOperationalGroup,
    supervisorAwareness: request.supervisorAwareness,
    supervisorNotes: request.supervisorNotes,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
    lastEdited: request.submittedAt.slice(0, 10),
    lastEditedAt: request.submittedAt,
    editedBy: employeeName,
  };
  if (existing) {
    saveHrRecords(records.map((r) => (r.id === request.id ? row : r)));
  } else {
    saveHrRecords([row, ...records]);
  }
}

export function upsertJobLetterFromEmployee(
  employeeId: string,
  employeeName: string,
  request: JobLetterRequest,
) {
  const records = readHrRecords();
  const row: AdminHrRecord = {
    id: request.id,
    requestType: "Job Letter Requests",
    employee: employeeName,
    employeeId,
    details: `${request.letterType}${request.notes ? ` · ${request.notes}` : ""}`,
    dateSubmitted: request.requestedAt.slice(0, 10),
    status: request.status,
    lastEdited: request.requestedAt.slice(0, 10),
    lastEditedAt: request.requestedAt,
    editedBy: employeeName,
  };
  const exists = records.some((r) => r.id === request.id);
  saveHrRecords(
    exists
      ? records.map((r) => (r.id === request.id ? row : r))
      : [row, ...records],
  );
}
