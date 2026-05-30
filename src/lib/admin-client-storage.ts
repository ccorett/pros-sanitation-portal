import {
  seedApprovalRequests,
  type ApprovalRequest,
  type ApprovalStatus,
} from "@/lib/admin-mock-data";
import type { InventoryItem } from "@/lib/equipment-supplies-mock-data";
import { inventoryItems } from "@/lib/equipment-supplies-mock-data";

const STOCK_OVERRIDES_PREFIX = "pros-admin-stock-overrides:";
const PURCHASING_REMOVED_PREFIX = "pros-admin-purchasing-removed:";
const PURCHASING_ORDERED_PREFIX = "pros-admin-purchasing-ordered:";

export type StockOverride = {
  availableQuantity?: number;
  reorderLevel?: number;
  storageArea?: string;
  lastUpdated?: string;
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
      disabled: override?.disabled ?? false,
      reordered: override?.reordered ?? false,
    };
  });
}

export function updateStockItem(
  itemId: string,
  patch: StockOverride,
): (InventoryItem & { disabled?: boolean; reordered?: boolean })[] {
  const overrides = getStockOverrides();
  overrides[itemId] = {
    ...overrides[itemId],
    ...patch,
    lastUpdated: patch.lastUpdated ?? new Date().toISOString().slice(0, 10),
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

export function removeFromPurchasingList(itemId: string) {
  const removed = new Set(getPurchasingRemovedIds());
  removed.add(itemId);
  localStorage.setItem(removedKey(), JSON.stringify([...removed]));
}

export function markPurchasingOrdered(itemId: string) {
  const ordered = new Set(getPurchasingOrderedIds());
  ordered.add(itemId);
  localStorage.setItem(orderedKey(), JSON.stringify([...ordered]));
  updateStockItem(itemId, { reordered: true });
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
}

export function updateApprovalStatus(id: string, status: ApprovalStatus) {
  const requests = getApprovalRequests().map((request) =>
    request.id === id ? { ...request, status } : request,
  );
  saveApprovalRequests(requests);
  return requests;
}
