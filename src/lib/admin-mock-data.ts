export type ApprovalRequestType =
  | "Stock Requests"
  | "Vacation Requests"
  | "Job Letter Requests"
  | "Payslip Requests"
  | "Cannot Access Job Reports"
  | "Reported Job Issues"
  | "Bin Setup Changes";

export type ApprovalPriority = "Normal" | "High" | "Critical";

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type ApprovalRequest = {
  id: string;
  requestType: ApprovalRequestType;
  requestedBy: string;
  details: string;
  dateSubmitted: string;
  priority: ApprovalPriority;
  status: ApprovalStatus;
};

export const seedApprovalRequests: ApprovalRequest[] = [
  {
    id: "apr-001",
    requestType: "Stock Requests",
    requestedBy: "Jordan Mitchell",
    details: "Nitrile Gloves (box) · Qty 5 · Night shift restock",
    dateSubmitted: "2026-05-20",
    priority: "High",
    status: "Pending",
  },
  {
    id: "apr-002",
    requestType: "Vacation Requests",
    requestedBy: "Alex Rivera",
    details: "Jul 22–24 · Personal appointment",
    dateSubmitted: "2026-05-18",
    priority: "Normal",
    status: "Pending",
  },
  {
    id: "apr-003",
    requestType: "Job Letter Requests",
    requestedBy: "Jordan Mitchell",
    details: "Employment Letter · Bank account opening",
    dateSubmitted: "2026-05-17",
    priority: "Normal",
    status: "Pending",
  },
  {
    id: "apr-004",
    requestType: "Payslip Requests",
    requestedBy: "Alex Rivera",
    details: "Duplicate payslip copy for March 2026",
    dateSubmitted: "2026-05-16",
    priority: "Normal",
    status: "Pending",
  },
  {
    id: "apr-005",
    requestType: "Cannot Access Job Reports",
    requestedBy: "Jordan Mitchell",
    details: "Canaan Pennysaver Grocery · Site locked / no access",
    dateSubmitted: "2026-05-19",
    priority: "Critical",
    status: "Pending",
  },
  {
    id: "apr-006",
    requestType: "Reported Job Issues",
    requestedBy: "Jordan Mitchell",
    details: "Scarborough Pennysaver Grocery · Missing bins reported",
    dateSubmitted: "2026-05-19",
    priority: "High",
    status: "Pending",
  },
  {
    id: "apr-007",
    requestType: "Bin Setup Changes",
    requestedBy: "Admin User",
    details: "Carnbee Pennysaver Grocery · Expected regular bins updated to 8",
    dateSubmitted: "2026-05-15",
    priority: "Normal",
    status: "Pending",
  },
];

export const supplierByCategory: Record<string, string> = {
  Equipment: "Pro Depot Supply Co.",
  Chemicals: "ChemSafe Tobago Ltd.",
  PPE: "SafetyFirst Wholesale",
  Consumables: "Island Janitorial Supply",
};

export function approvalPriorityClass(priority: ApprovalPriority): string {
  if (priority === "Critical") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (priority === "High") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
}

export function approvalStatusClass(status: ApprovalStatus): string {
  if (status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function formatAdminDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function suggestedPurchaseQuantity(
  availableQuantity: number,
  reorderLevel: number,
): number {
  return Math.max(reorderLevel * 2 - availableQuantity, reorderLevel);
}
