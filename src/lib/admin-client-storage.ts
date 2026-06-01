import {
  seedApprovalRequests,
  type ApprovalRequest,
  type ApprovalStatus,
} from "@/lib/admin-mock-data";
import type { InventoryItem } from "@/lib/equipment-supplies-mock-data";
import { inventoryItems } from "@/lib/equipment-supplies-mock-data";
import { appendEditHistory } from "@/lib/platform-edit-history";

const DEFAULT_ADMIN_EDITOR = "Admin User";

function notifyPlatformUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pros-platform-data-updated"));
  }
}

const STOCK_OVERRIDES_PREFIX = "pros-admin-stock-overrides:";
const PURCHASING_REMOVED_PREFIX = "pros-admin-purchasing-removed:";
const PURCHASING_ORDERED_PREFIX = "pros-admin-purchasing-ordered:";

export type StockOverride = {
  availableQuantity?: number;
  reorderLevel?: number;
  storageArea?: string;
  lastUpdated?: string;
  lastEditedAt?: string;
  editedBy?: string;
  disabled?: boolean;
  reordered?: boolean;
};

function stockKey() {
  return STOCK_OVERRIDES_PREFIX;
}

function removedKey() {
  return PURCHASING_REMOVED_PREFIX;
}

function orderedKey() {
  return PURCHASING_ORDERED_PREFIX;
}

export function getStockOverrides(): Record<string, StockOverride> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(stockKey());
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, StockOverride>;
  } catch {
    return {};
  }
}

export function saveStockOverrides(overrides: Record<string, StockOverride>) {
  localStorage.setItem(stockKey(), JSON.stringify(overrides));
  notifyPlatformUpdate();
}

export function getManagedInventoryItems(): InventoryItem[] {
  const overrides = getStockOverrides();
  return inventoryItems
    .map((item) => {
      const override = overrides[item.id];
      if (!override) return item;
      return {
        ...item,
        ...override,
        availableQuantity: override.availableQuantity ?? item.availableQuantity,
        reorderLevel: override.reorderLevel ?? item.reorderLevel,
        storageArea: override.storageArea ?? item.storageArea,
        lastUpdated: override.lastUpdated ?? item.lastUpdated,
      };
    })
    .filter((item) => !overrides[item.id]?.disabled);
}

export function getAllManagedInventoryItems(): (InventoryItem & {
  disabled?: boolean;
  reordered?: boolean;
  editedBy?: string;
  lastEditedAt?: string;
})[] {
  const overrides = getStockOverrides();
  return inventoryItems.map((item) => {
    const override = overrides[item.id];
    return {
      ...item,
      ...override,
      availableQuantity: override?.availableQuantity ?? item.availableQuantity,
      reorderLevel: override?.reorderLevel ?? item.reorderLevel,
      storageArea: override?.storageArea ?? item.storageArea,
      lastUpdated: override?.lastUpdated ?? item.lastUpdated,
      lastEditedAt: override?.lastEditedAt,
      editedBy: override?.editedBy,
      disabled: override?.disabled ?? false,
      reordered: override?.reordered ?? false,
    };
  });
}

export function updateStockItem(
  itemId: string,
  patch: StockOverride,
  editedBy: string = DEFAULT_ADMIN_EDITOR,
): (InventoryItem & { disabled?: boolean; reordered?: boolean })[] {
  const base = inventoryItems.find((item) => item.id === itemId);
  const previous = getAllManagedInventoryItems().find((item) => item.id === itemId);
  const overrides = getStockOverrides();
  const now = new Date().toISOString();
  const nextQty = patch.availableQuantity ?? previous?.availableQuantity;
  const prevQty = previous?.availableQuantity ?? base?.availableQuantity;

  if (
    base &&
    patch.availableQuantity !== undefined &&
    prevQty !== undefined &&
    nextQty !== prevQty
  ) {
    appendEditHistory({
      recordId: itemId,
      section: "Stock Management",
      recordName: base.name,
      actionType: "Quantity Update",
      previousValue: String(prevQty),
      newValue: String(nextQty),
      editedBy,
    });
  }

  overrides[itemId] = {
    ...overrides[itemId],
    ...patch,
    lastUpdated: patch.lastUpdated ?? now.slice(0, 10),
    lastEditedAt: patch.lastEditedAt ?? now,
    editedBy: patch.editedBy ?? editedBy,
  };
  saveStockOverrides(overrides);
  return getAllManagedInventoryItems();
}

export function getPurchasingRemovedIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(removedKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function getPurchasingOrderedIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(orderedKey());
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function removeFromPurchasingList(
  itemId: string,
  editedBy: string = DEFAULT_ADMIN_EDITOR,
) {
  const item = inventoryItems.find((row) => row.id === itemId);
  const removed = new Set(getPurchasingRemovedIds());
  removed.add(itemId);
  localStorage.setItem(removedKey(), JSON.stringify([...removed]));
  if (item) {
    appendEditHistory({
      recordId: itemId,
      section: "Purchasing List",
      recordName: item.name,
      actionType: "Removed From List",
      previousValue: "Active",
      newValue: "Removed",
      editedBy,
    });
  }
  notifyPlatformUpdate();
}

export function markPurchasingOrdered(
  itemId: string,
  editedBy: string = DEFAULT_ADMIN_EDITOR,
) {
  const item = inventoryItems.find((row) => row.id === itemId);
  const ordered = new Set(getPurchasingOrderedIds());
  ordered.add(itemId);
  localStorage.setItem(orderedKey(), JSON.stringify([...ordered]));
  if (item) {
    appendEditHistory({
      recordId: itemId,
      section: "Purchasing List",
      recordName: item.name,
      actionType: "Marked Ordered",
      previousValue: "Needs Purchase",
      newValue: "Ordered",
      editedBy,
    });
  }
  updateStockItem(itemId, { reordered: true }, editedBy);
}

export function getPurchasingListItems(): InventoryItem[] {
  const removed = new Set(getPurchasingRemovedIds());
  const ordered = new Set(getPurchasingOrderedIds());
  return getManagedInventoryItems().filter(
    (item) =>
      item.availableQuantity <= item.reorderLevel &&
      !removed.has(item.id) &&
      !ordered.has(item.id),
  );
}

const APPROVALS_PREFIX = "pros-admin-approvals:";
const BIN_ATT_RESOLVED_PREFIX = "pros-admin-bin-att-resolved:";

export function getBinAttResolvedIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(BIN_ATT_RESOLVED_PREFIX);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function resolveBinAttentionApproval(
  id: string,
  status: ApprovalStatus,
  editedBy: string,
) {
  const resolved = new Set(getBinAttResolvedIds());
  resolved.add(id);
  localStorage.setItem(BIN_ATT_RESOLVED_PREFIX, JSON.stringify([...resolved]));
  appendEditHistory({
    recordId: id,
    section: "Requests for Approval",
    recordName: "Bin Service Issues",
    actionType: "Status Change",
    previousValue: "Pending",
    newValue: status,
    editedBy,
  });
  notifyPlatformUpdate();
}

export function getApprovalRequests(): ApprovalRequest[] {
  if (typeof window === "undefined") return seedApprovalRequests;

  const raw = localStorage.getItem(APPROVALS_PREFIX);
  if (!raw) return seedApprovalRequests;

  try {
    const parsed = JSON.parse(raw) as ApprovalRequest[];
    return Array.isArray(parsed) ? parsed : seedApprovalRequests;
  } catch {
    return seedApprovalRequests;
  }
}

export function saveApprovalRequests(requests: ApprovalRequest[]) {
  localStorage.setItem(APPROVALS_PREFIX, JSON.stringify(requests));
  notifyPlatformUpdate();
}

export function updateApprovalStatus(
  id: string,
  status: ApprovalStatus,
  editedBy: string = DEFAULT_ADMIN_EDITOR,
) {
  if (id.startsWith("bin-att-")) {
    resolveBinAttentionApproval(id, status, editedBy);
    return getApprovalRequests();
  }

  const now = new Date().toISOString();
  const requests = getApprovalRequests().map((request) => {
    if (request.id !== id) return request;
    appendEditHistory({
      recordId: id,
      section: "Requests for Approval",
      recordName: `${request.requestType} — ${request.requestedBy}`,
      actionType: "Status Change",
      previousValue: request.status,
      newValue: status,
      editedBy,
      notes: request.details,
    });
    return {
      ...request,
      status,
      lastEdited: now.slice(0, 10),
      lastEditedAt: now,
      editedBy,
    };
  });
  saveApprovalRequests(requests);
  return requests;
}
