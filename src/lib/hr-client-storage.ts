import type {
  JobLetterRequest,
  VacationRequest,
} from "@/lib/hr-mock-data";
import {
  seedJobLetterRequests,
  seedVacationRequests,
} from "@/lib/hr-mock-data";

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

export function getVacationRequests(employeeId: string): VacationRequest[] {
  if (typeof window === "undefined") return seedVacationRequests;

  const raw = localStorage.getItem(storageKey(VACATION_PREFIX, employeeId));
  if (!raw) return seedVacationRequests;

  try {
    const parsed = JSON.parse(raw) as VacationRequest[];
    return Array.isArray(parsed) ? parsed : seedVacationRequests;
  } catch {
    return seedVacationRequests;
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

export function addVacationRequest(
  employeeId: string,
  request: Omit<VacationRequest, "id" | "status" | "submittedAt">,
): VacationRequest[] {
  const existing = getVacationRequests(employeeId);
  const created: VacationRequest = {
    ...request,
    id: `vac-${Date.now()}`,
    status: "Pending",
    submittedAt: new Date().toISOString(),
  };
  const updated = [created, ...existing];
  saveVacationRequests(employeeId, updated);
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
  return updated;
}
