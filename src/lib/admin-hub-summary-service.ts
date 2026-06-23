import type { Employee } from "@prisma/client";
import {
  EquipmentRequestStatus,
  JobLetterRequestStatus,
  PayslipRequestStatus,
  VacationFinalStatus,
} from "@prisma/client";
import { countPendingVerificationAccounts } from "@/lib/admin-accounts-service";
import { filterAttentionSites } from "@/lib/bin-service/field-filters";
import { listBinFieldSitesForActor } from "@/lib/bin-service/field-service";
import {
  countLowStockActiveItems,
  getLatestInventoryActivityLabel,
  listPurchasingListItems,
} from "@/lib/inventory-service";
import { countActivePolicies } from "@/lib/policy-service";
import { getInvoiceAlertSummary } from "@/lib/invoice-service";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  hasAdminAssistantResponsibility,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { canAccessAdminModule } from "@/lib/access-levels";
import { formatEditTimestamp } from "@/lib/admin-format";
import { prisma } from "@/lib/prisma";

export type AdminHubCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
  lastEditedLabel: string | null;
};

export type AdminHubSummaryCounts = {
  pendingEquipmentRequests: number;
  lowStockItems: number;
  pendingVacationRequests: number;
  pendingJobLetterRequests: number;
  pendingPayslipRequests: number;
  pendingAccountVerifications: number;
  binAttentionItems: number;
  purchasingListItems: number;
  activePolicies: number;
  openInvoiceSchedules: number;
};

export type AdminHubSummary = {
  counts: AdminHubSummaryCounts;
  cards: AdminHubCard[];
};

const TERMINAL_VACATION_STATUSES: VacationFinalStatus[] = [
  VacationFinalStatus.APPROVED,
  VacationFinalStatus.REJECTED,
  VacationFinalStatus.CANCELLED,
];

export async function getAdminHubSummaryCounts(
  actor: Employee,
): Promise<AdminHubSummaryCounts> {
  const [
    pendingEquipmentRequests,
    lowStockItems,
    pendingVacationRequests,
    pendingJobLetterRequests,
    pendingPayslipRequests,
    pendingAccountVerifications,
    binSites,
    purchasingListItems,
    activePolicies,
  ] = await Promise.all([
    prisma.equipmentRequest.count({
      where: { status: EquipmentRequestStatus.PENDING },
    }),
    countLowStockActiveItems(),
    prisma.vacationRequest.count({
      where: {
        finalStatus: { notIn: TERMINAL_VACATION_STATUSES },
      },
    }),
    prisma.jobLetterRequest.count({
      where: { status: JobLetterRequestStatus.PENDING },
    }),
    prisma.payslipRequest.count({
      where: { status: PayslipRequestStatus.PENDING },
    }),
    countPendingVerificationAccounts(),
    listBinFieldSitesForActor(actor),
    listPurchasingListItems(),
    countActivePolicies(),
  ]);

  const invoiceAlerts = await getInvoiceAlertSummary();
  const openInvoiceSchedules =
    invoiceAlerts.dueSoon +
    invoiceAlerts.dueToday +
    invoiceAlerts.overdue +
    invoiceAlerts.upcoming;

  return {
    pendingEquipmentRequests,
    lowStockItems,
    pendingVacationRequests,
    pendingJobLetterRequests,
    pendingPayslipRequests,
    pendingAccountVerifications,
    binAttentionItems: filterAttentionSites(binSites).length,
    purchasingListItems: purchasingListItems.length,
    activePolicies,
    openInvoiceSchedules,
  };
}

function approvalInboxCount(counts: AdminHubSummaryCounts): number {
  return (
    counts.pendingEquipmentRequests +
    counts.pendingVacationRequests +
    counts.pendingJobLetterRequests +
    counts.pendingPayslipRequests +
    counts.binAttentionItems
  );
}

function humanResourcesCount(counts: AdminHubSummaryCounts): number {
  return (
    counts.pendingVacationRequests +
    counts.pendingJobLetterRequests +
    counts.pendingPayslipRequests +
    counts.activePolicies
  );
}

export async function buildAdminHubCards(
  actor: Employee,
  counts: AdminHubSummaryCounts,
): Promise<AdminHubCard[]> {
  const [
    latestAccessHistory,
    latestAccountAudit,
    lastInventoryActivity,
    latestBinLog,
    latestHrActivity,
    latestPolicy,
    invoiceAlerts,
  ] = await Promise.all([
    prisma.accessHistory.findFirst({
      orderBy: { changedAt: "desc" },
      select: { changedAt: true },
    }),
    prisma.accountAuditLog.findFirst({
      orderBy: { changedAt: "desc" },
      select: { changedAt: true },
    }),
    getLatestInventoryActivityLabel(),
    prisma.binServiceLog.findFirst({
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.jobLetterRequest.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.policy.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    getInvoiceAlertSummary(),
  ]);

  const inventoryLastEdited = lastInventoryActivity
    ? formatEditTimestamp(lastInventoryActivity)
    : null;

  return [
    {
      id: "approval-inbox",
      title: "Approval Inbox",
      description:
        "Equipment, vacation, job letter, payslip, and bin service items needing review.",
      href: "/admin/approvals",
      count: approvalInboxCount(counts),
      lastEditedLabel: null,
    },
    {
      id: "accounts",
      title: "Employee Accounts",
      description:
        "Approve new accounts, assign roles, and manage employee account status.",
      href: "/admin/accounts",
      count: counts.pendingAccountVerifications,
      lastEditedLabel: (() => {
        const candidates = [
          latestAccessHistory?.changedAt,
          latestAccountAudit?.changedAt,
        ].filter((value): value is Date => value instanceof Date);

        if (candidates.length === 0) {
          return null;
        }

        const latest = candidates.sort(
          (left, right) => right.getTime() - left.getTime(),
        )[0];

        return formatEditTimestamp(latest.toISOString());
      })(),
    },
    {
      id: "stock",
      title: "Stock Management",
      description:
        "Inventory list and reorder list for low-stock items from Equipment & Supplies.",
      href: "/admin/stock-management",
      count: counts.lowStockItems + counts.purchasingListItems,
      lastEditedLabel: inventoryLastEdited,
    },
    {
      id: "invoices",
      title: "Invoice Management",
      description: `Track recurring invoices, due dates, invoice status and alerts. ${invoiceAlerts.dueSoon} due soon, ${invoiceAlerts.dueToday} due today, ${invoiceAlerts.overdue} overdue.`,
      href: "/admin/invoices",
      count:
        invoiceAlerts.dueSoon + invoiceAlerts.dueToday + invoiceAlerts.overdue,
      lastEditedLabel: null,
    },
    {
      id: "bin-services",
      title: "Bin Services",
      description:
        "Bin sites, route locations, setup, technician updates, and service history.",
      href: "/admin/bin-services",
      count: counts.binAttentionItems,
      lastEditedLabel: latestBinLog
        ? formatEditTimestamp(latestBinLog.completedAt.toISOString())
        : null,
    },
    {
      id: "human-resources",
      title: "Human Resources",
      description:
        "Vacation, job letter, payslip requests, payslip archive, and policy management.",
      href: "/admin/human-resources",
      count: humanResourcesCount(counts),
      lastEditedLabel: latestHrActivity
        ? formatEditTimestamp(latestHrActivity.updatedAt.toISOString())
        : latestPolicy
          ? formatEditTimestamp(latestPolicy.updatedAt.toISOString())
          : null,
    },
  ];
}

function filterAdminHubCardsForActor(
  cards: AdminHubCard[],
  actor: Employee,
  responsibilities: Awaited<ReturnType<typeof resolveEmployeeResponsibilitiesForActor>>,
): AdminHubCard[] {
  const accessContext = buildInvoiceAccessContext(actor, responsibilities);
  const isFullAdmin = canAccessAdminModule(actor.accessLevel);
  const isAdminAssistantOnly =
    !isFullAdmin && hasAdminAssistantResponsibility(accessContext);

  if (isAdminAssistantOnly) {
    return cards.filter((card) => card.id === "invoices");
  }

  return cards.filter((card) => {
    if (card.id === "invoices") {
      return canAccessInvoiceManagement(accessContext);
    }
    return isFullAdmin;
  });
}

export async function getAdminHubSummary(actor: Employee): Promise<AdminHubSummary> {
  const counts = await getAdminHubSummaryCounts(actor);
  const cards = await buildAdminHubCards(actor, counts);
  const responsibilities = await resolveEmployeeResponsibilitiesForActor(actor);
  return {
    counts,
    cards: filterAdminHubCardsForActor(cards, actor, responsibilities),
  };
}
