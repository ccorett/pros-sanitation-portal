import type { InventoryRequest } from "@/lib/equipment-supplies-mock-data";

const REQUESTS_PREFIX = "pros-equipment-requests:";

function storageKey(employeeRecordId: string) {
  return `${REQUESTS_PREFIX}${employeeRecordId}`;
}

export function getInventoryRequests(employeeRecordId: string): InventoryRequest[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(storageKey(employeeRecordId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as InventoryRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInventoryRequests(
  employeeRecordId: string,
  requests: InventoryRequest[],
) {
  localStorage.setItem(storageKey(employeeRecordId), JSON.stringify(requests));
}

export function addInventoryRequest(
  employeeRecordId: string,
  request: Omit<InventoryRequest, "id" | "submittedAt">,
): InventoryRequest[] {
  const existing = getInventoryRequests(employeeRecordId);
  const created: InventoryRequest = {
    ...request,
    id: `req-${Date.now()}`,
    submittedAt: new Date().toISOString(),
  };
  const updated = [created, ...existing];
  saveInventoryRequests(employeeRecordId, updated);
  return updated;
}
