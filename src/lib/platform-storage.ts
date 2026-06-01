/**
 * Shared platform data facade — admin and staff modules import from here
 * to avoid duplicate lists. TODO: enforce role-based access on admin-only actions.
 */

export {
  getApprovalRequests,
  getAllManagedInventoryItems,
  getManagedInventoryItems,
  getPurchasingListItems,
  saveApprovalRequests,
  updateApprovalStatus,
  updateStockItem,
  removeFromPurchasingList,
  markPurchasingOrdered,
  type StockOverride,
} from "@/lib/admin-client-storage";

export {
  getBinLocations,
  getBinAttentionItems,
  getDueAndOverdueLocations,
  applyTechnicianServiceUpdate,
  type BinLocationView,
} from "@/lib/bin-locations-storage";

export {
  inventoryItems,
  type InventoryItem,
  type InventoryCategory,
} from "@/lib/equipment-supplies-mock-data";

export {
  getAdminHrRecords,
  updateAdminHrStatus,
  upsertVacationFromEmployee,
  upsertJobLetterFromEmployee,
  type AdminHrRecord,
} from "@/lib/platform-hr-storage";

export {
  appendEditHistory,
  getEditHistoryForRecord,
  getEditHistoryForSection,
  formatEditTimestamp,
  type EditHistoryEntry,
  type PlatformEditSection,
} from "@/lib/platform-edit-history";

export {
  seedApprovalRequests,
  approvalPriorityClass,
  approvalStatusClass,
  formatAdminDate,
  suggestedPurchaseQuantity,
  supplierByCategory,
  type ApprovalRequest,
  type ApprovalRequestType,
} from "@/lib/admin-mock-data";

import {
  getApprovalRequests,
  getBinAttResolvedIds,
  getPurchasingListItems,
  getAllManagedInventoryItems,
} from "@/lib/admin-client-storage";
import {
  getBinAttentionItems,
  getBinLocations,
} from "@/lib/bin-locations-storage";
import { getAdminHrRecords } from "@/lib/platform-hr-storage";
import {
  formatEditTimestamp,
  getEditHistoryForSection,
} from "@/lib/platform-edit-history";
import type { ApprovalRequest } from "@/lib/admin-mock-data";

export type AdminHubSection = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  lastEditedLabel: string | null;
};

function latestTimestamp(timestamps: (string | undefined)[]): string | null {
  const valid = timestamps.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.localeCompare(a))[0] ?? null;
}

/** Merge bin attention into unified approval queue (client only). */
export function getUnifiedApprovalRequests(): ApprovalRequest[] {
  const base = getApprovalRequests();
  const binItems = getBinAttentionItems();

  const binApprovals: ApprovalRequest[] = binItems.map((item) => ({
    id: `bin-att-${item.id}`,
    requestType: "Bin Service Issues" as ApprovalRequest["requestType"],
    requestedBy: item.lastUpdatedBy ?? "Bin Technician",
    details: `${item.locationName} · ${item.issueOrAccessReason}`,
    dateSubmitted: item.lastUpdatedAt?.slice(0, 10) ?? item.lastServiceDate,
    priority: "High",
    status: "Pending",
    lastEdited: item.lastUpdatedAt?.slice(0, 10),
    lastEditedAt: item.lastUpdatedAt,
    editedBy: item.lastUpdatedBy,
  }));

  const resolved = new Set(getBinAttResolvedIds());
  const merged = [...base, ...binApprovals];
  const seen = new Set<string>();
  return merged.filter((row) => {
    if (resolved.has(row.id)) return false;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function getAdminHubSections(): AdminHubSection[] {
  const approvals = getUnifiedApprovalRequests().filter((r) => r.status === "Pending");
  const stock = getAllManagedInventoryItems().filter((i) => !i.disabled);
  const purchasing = getPurchasingListItems();
  const binLocations =
    typeof window !== "undefined" ? getBinLocations() : [];
  const binAttention = getBinAttentionItems();
  const hrPending = getAdminHrRecords().filter((r) => r.status === "Pending");

  const approvalHistory = getEditHistoryForSection("Requests for Approval");
  const stockHistory = getEditHistoryForSection("Stock Management");
  const purchasingHistory = getEditHistoryForSection("Purchasing List");
  const binHistory = getEditHistoryForSection("Bin Services");
  const hrHistory = getEditHistoryForSection("Human Resources");

  const binLastEdited = latestTimestamp(
    (binLocations as { lastUpdatedAt?: string }[]).map((l) => l.lastUpdatedAt),
  );

  return [
    {
      id: "approvals",
      title: "Requests for Approval",
      description:
        "Stock, vacation, job letters, payslips, job reports, and bin service items.",
      href: "/admin/approvals",
      count: approvals.length,
      lastEditedLabel: approvalHistory[0]
        ? formatEditTimestamp(approvalHistory[0].editedAt)
        : null,
    },
    {
      id: "stock",
      title: "Stock Management",
      description: "Edit inventory quantities, reorder levels, and storage areas.",
      href: "/admin/stock-management",
      count: stock.length,
      lastEditedLabel: stockHistory[0]
        ? formatEditTimestamp(stockHistory[0].editedAt)
        : null,
    },
    {
      id: "purchasing",
      title: "Purchasing List",
      description: "Items at or below reorder level from Equipment & Supplies.",
      href: "/admin/purchasing-list",
      count: purchasing.length,
      lastEditedLabel: purchasingHistory[0]
        ? formatEditTimestamp(purchasingHistory[0].editedAt)
        : null,
    },
    {
      id: "bin-services",
      title: "Bin Services",
      description:
        "Bin sites, route locations, setup, technician updates, and service history.",
      href: "/admin/bin-services",
      count: binAttention.length,
      lastEditedLabel: binHistory[0]
        ? formatEditTimestamp(binHistory[0].editedAt)
        : binLastEdited
          ? formatEditTimestamp(binLastEdited)
          : null,
    },
    {
      id: "human-resources",
      title: "Human Resources",
      description: "Vacation, job letter, and payslip request approvals.",
      href: "/admin/human-resources",
      count: hrPending.length,
      lastEditedLabel: hrHistory[0]
        ? formatEditTimestamp(hrHistory[0].editedAt)
        : null,
    },
  ];
}
