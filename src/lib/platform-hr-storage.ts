import type {
  JobLetterRequest,
  JobLetterRequestStatus,
  VacationRequest,
  VacationRequestStatus,
} from "@/lib/hr-mock-data";
import {
  getJobLetterRequests,
  getVacationRequests,
  saveJobLetterRequests,
  saveVacationRequests,
} from "@/lib/hr-client-storage";
import { appendEditHistory } from "@/lib/platform-edit-history";

export type AdminHrRecord = {
  id: string;
  requestType: "Vacation Requests" | "Job Letter Requests" | "Payslip Requests";
  employee: string;
  employeeId: string;
  details: string;
  dateSubmitted: string;
  status: VacationRequestStatus | JobLetterRequestStatus;
  lastEdited?: string;
  lastEditedAt?: string;
  editedBy?: string;
};

const HR_ADMIN_PREFIX = "pros-platform-hr-admin:";

const seedHrAdminRecords: AdminHrRecord[] = [
  {
    id: "hr-vac-002",
    requestType: "Vacation Requests",
    employee: "Alex Rivera",
    employeeId: "emp-demo-002",
    details: "Jul 22–24 · Personal appointment",
    dateSubmitted: "2026-05-18",
    status: "Pending",
    lastEdited: "2026-05-18",
    lastEditedAt: "2026-05-18T14:30:00.000Z",
    editedBy: "Alex Rivera",
  },
  {
    id: "hr-vac-001",
    requestType: "Vacation Requests",
    employee: "Jordan Mitchell",
    employeeId: "emp-demo-001",
    details: "Jun 10–14 · Family travel",
    dateSubmitted: "2026-05-01",
    status: "Approved",
    lastEdited: "2026-05-17",
    lastEditedAt: "2026-05-17T11:00:00.000Z",
    editedBy: "Admin User",
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
  {
    id: "payslip-req-001",
    requestType: "Payslip Requests",
    employee: "Alex Rivera",
    employeeId: "emp-demo-002",
    details: "Duplicate payslip copy for March 2026",
    dateSubmitted: "2026-05-16",
    status: "Pending",
    lastEdited: "2026-05-16",
    lastEditedAt: "2026-05-16T10:00:00.000Z",
    editedBy: "Alex Rivera",
  },
];

function readHrRecords(): AdminHrRecord[] {
  if (typeof window === "undefined") return seedHrAdminRecords;
  const raw = localStorage.getItem(HR_ADMIN_PREFIX);
  if (!raw) return seedHrAdminRecords;
  try {
    const parsed = JSON.parse(raw) as AdminHrRecord[];
    return Array.isArray(parsed) ? parsed : seedHrAdminRecords;
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

/** Sync employee vacation submit into platform HR store (single source). */
export function upsertVacationFromEmployee(
  employeeId: string,
  employeeName: string,
  request: VacationRequest,
) {
  const records = readHrRecords();
  const existing = records.find((r) => r.id === request.id);
  const row: AdminHrRecord = {
    id: request.id,
    requestType: "Vacation Requests",
    employee: employeeName,
    employeeId,
    details: `${request.startDate} – ${request.endDate} · ${request.reason}`,
    dateSubmitted: request.submittedAt.slice(0, 10),
    status: request.status,
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
