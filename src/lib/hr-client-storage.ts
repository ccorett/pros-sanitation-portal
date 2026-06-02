import type { JobLetterRequest, VacationRequest } from "@/lib/hr-mock-data";
import {
  seedJobLetterRequests,
  seedVacationRequests,
} from "@/lib/hr-mock-data";
import { OperationalGroup } from "@prisma/client";
import {
  resolveSupervisorEmailForSubmit,
  toWorkflowRequest,
  type VacationWorkflowRequest,
} from "@/lib/vacation-workflow";

const PROFILE_PIC_PREFIX = "pros-hr-profile-pic:";
const VACATION_PREFIX = "pros-hr-vacation:";
const JOB_LETTERS_PREFIX = "pros-hr-job-letters:";

function storageKey(prefix: string, employeeId: string) {
  return `${prefix}${employeeId}`;
}

export function getProfilePicture(employeeId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey(PROFILE_PIC_PREFIX, employeeId));
}

export function setProfilePicture(employeeId: string, dataUrl: string) {
  localStorage.setItem(storageKey(PROFILE_PIC_PREFIX, employeeId), dataUrl);
}

export function getVacationRequests(
  employeeId: string,
  serverSeed?: VacationWorkflowRequest[],
): VacationRequest[] {
  if (typeof window === "undefined") {
    return serverSeed ?? seedVacationRequests;
  }

  const raw = localStorage.getItem(storageKey(VACATION_PREFIX, employeeId));
  if (!raw) {
    return serverSeed ?? seedVacationRequests;
  }

  try {
    const parsed = JSON.parse(raw) as VacationRequest[];
    if (!Array.isArray(parsed)) {
      return serverSeed ?? seedVacationRequests;
    }
    if (serverSeed?.length && !parsed.some((row) => row.id === serverSeed[0].id)) {
      return [...serverSeed, ...parsed];
    }
    return parsed;
  } catch {
    return serverSeed ?? seedVacationRequests;
  }
}

export function saveVacationRequests(
  employeeId: string,
  requests: VacationRequest[],
) {
  localStorage.setItem(
    storageKey(VACATION_PREFIX, employeeId),
    JSON.stringify(requests),
  );
}

export type VacationSubmitMeta = {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  locationAssignment: string;
  operationalGroup: OperationalGroup;
};

export function addVacationRequest(
  meta: VacationSubmitMeta,
  request: Omit<VacationRequest, "id" | "status" | "submittedAt">,
): VacationRequest[] {
  const existing = getVacationRequests(meta.employeeId);
  const created = toWorkflowRequest(
    {
      ...request,
      id: `vac-${Date.now()}`,
      status: "Pending",
      submittedAt: new Date().toISOString(),
    },
    {
      employeeEmail: meta.employeeEmail,
      employeeName: meta.employeeName,
      locationAssignment: meta.locationAssignment,
      operationalGroup: meta.operationalGroup,
      supervisorEmail: resolveSupervisorEmailForSubmit({
        operationalGroup: meta.operationalGroup,
        locationAssignment: meta.locationAssignment,
      }),
    },
  );

  const updated = [created, ...existing];
  saveVacationRequests(meta.employeeId, updated);

  if (typeof window !== "undefined") {
    void import("@/lib/platform-hr-storage").then(({ upsertVacationFromEmployee }) => {
      upsertVacationFromEmployee(meta.employeeId, meta.employeeName, created);
    });
  }

  return updated;
}

export function getJobLetterRequests(employeeId: string): JobLetterRequest[] {
  if (typeof window === "undefined") return seedJobLetterRequests;

  const raw = localStorage.getItem(storageKey(JOB_LETTERS_PREFIX, employeeId));
  if (!raw) return seedJobLetterRequests;

  try {
    const parsed = JSON.parse(raw) as JobLetterRequest[];
    return Array.isArray(parsed) ? parsed : seedJobLetterRequests;
  } catch {
    return seedJobLetterRequests;
  }
}

export function saveJobLetterRequests(
  employeeId: string,
  requests: JobLetterRequest[],
) {
  localStorage.setItem(
    storageKey(JOB_LETTERS_PREFIX, employeeId),
    JSON.stringify(requests),
  );
}

export function addJobLetterRequest(
  employeeId: string,
  letterType: JobLetterRequest["letterType"],
  notes?: string,
): JobLetterRequest[] {
  const existing = getJobLetterRequests(employeeId);
  const created: JobLetterRequest = {
    id: `letter-${Date.now()}`,
    letterType,
    status: "Pending",
    requestedAt: new Date().toISOString(),
    notes,
  };
  const updated = [created, ...existing];
  saveJobLetterRequests(employeeId, updated);
  if (typeof window !== "undefined") {
    void import("@/lib/platform-hr-storage").then(({ upsertJobLetterFromEmployee }) => {
      upsertJobLetterFromEmployee(employeeId, employeeId, created);
    });
  }
  return updated;
}
