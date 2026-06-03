import type { Employee } from "@prisma/client";
import {
  EquipmentRequestStatus,
  JobLetterRequestStatus,
  PayslipRequestStatus,
  VacationFinalStatus,
} from "@prisma/client";
import { filterAttentionSites } from "@/lib/bin-service/field-filters";
import { listBinFieldSitesForActor } from "@/lib/bin-service/field-service";
import { formatBinFieldDate } from "@/lib/bin-service/field-format";
import { prisma } from "@/lib/prisma";

export type ApprovalInboxType =
  | "equipment"
  | "vacation"
  | "job-letter"
  | "payslip"
  | "bin-issue";

export type ApprovalInboxItem = {
  id: string;
  type: ApprovalInboxType;
  typeLabel: string;
  submittedBy: string;
  location: string;
  dateSubmitted: string;
  status: string;
  actionHref: string;
};

const TYPE_LABELS: Record<ApprovalInboxType, string> = {
  equipment: "Equipment Request",
  vacation: "Vacation Request",
  "job-letter": "Job Letter Request",
  payslip: "Payslip Request",
  "bin-issue": "Bin Issue",
};

function formatSubmittedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function listApprovalInboxItems(
  _actor: Employee,
): Promise<ApprovalInboxItem[]> {
  const [equipment, vacations, jobLetters, payslips, binSites] =
    await Promise.all([
      prisma.equipmentRequest.findMany({
        where: { status: EquipmentRequestStatus.PENDING },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vacationRequest.findMany({
        where: {
          finalStatus: {
            in: [
              VacationFinalStatus.PENDING_SUPERVISOR_REVIEW,
              VacationFinalStatus.PENDING_MANAGER_REVIEW,
            ],
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.jobLetterRequest.findMany({
        where: { status: JobLetterRequestStatus.PENDING },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payslipRequest.findMany({
        where: { status: PayslipRequestStatus.PENDING },
        orderBy: { createdAt: "desc" },
      }),
      listBinFieldSitesForActor(_actor),
    ]);

  const binAttention = filterAttentionSites(binSites);

  type InboxDraft = ApprovalInboxItem & { sortAt: string };

  const items: InboxDraft[] = [
    ...equipment.map((row) => ({
      id: row.id,
      type: "equipment" as const,
      typeLabel: TYPE_LABELS.equipment,
      submittedBy: row.requestedByName,
      location: "—",
      dateSubmitted: formatSubmittedDate(row.createdAt.toISOString()),
      sortAt: row.createdAt.toISOString(),
      status: "Pending",
      actionHref: `/manager/approvals?equipmentRequestId=${row.id}`,
    })),
    ...vacations.map((row) => ({
      id: row.id,
      type: "vacation" as const,
      typeLabel: TYPE_LABELS.vacation,
      submittedBy: row.employeeName,
      location: row.locationAssignment,
      dateSubmitted: formatSubmittedDate(row.createdAt.toISOString()),
      sortAt: row.createdAt.toISOString(),
      status:
        row.finalStatus === VacationFinalStatus.PENDING_SUPERVISOR_REVIEW
          ? "Pending Supervisor Review"
          : "Pending Manager Review",
      actionHref:
        row.finalStatus === VacationFinalStatus.PENDING_SUPERVISOR_REVIEW
          ? `/hr/supervisor-reviews?requestId=${row.id}`
          : `/manager/approvals?requestId=${row.id}`,
    })),
    ...jobLetters.map((row) => ({
      id: row.id,
      type: "job-letter" as const,
      typeLabel: TYPE_LABELS["job-letter"],
      submittedBy: row.employeeName,
      location: "—",
      dateSubmitted: formatSubmittedDate(row.createdAt.toISOString()),
      sortAt: row.createdAt.toISOString(),
      status: "Pending",
      actionHref: `/admin/human-resources?focus=job-letter&requestId=${row.id}`,
    })),
    ...payslips.map((row) => ({
      id: row.id,
      type: "payslip" as const,
      typeLabel: TYPE_LABELS.payslip,
      submittedBy: row.employeeName,
      location: "—",
      dateSubmitted: formatSubmittedDate(row.createdAt.toISOString()),
      sortAt: row.createdAt.toISOString(),
      status: "Pending",
      actionHref: `/admin/human-resources?focus=payslip&requestId=${row.id}`,
    })),
    ...binAttention.map((row) => ({
      id: row.siteId,
      type: "bin-issue" as const,
      typeLabel: TYPE_LABELS["bin-issue"],
      submittedBy: row.lastUpdatedBy ?? "Bin Technician",
      location: row.location,
      dateSubmitted: row.lastUpdatedAt
        ? formatSubmittedDate(row.lastUpdatedAt)
        : formatBinFieldDate(row.nextServiceDate),
      sortAt: row.lastUpdatedAt ?? row.nextServiceDate ?? "",
      status: row.rotation.label,
      actionHref: `/admin/bin-services?siteId=${row.siteId}`,
    })),
  ];

  return items
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt))
    .map((item) => {
      const { sortAt: _ignored, ...row } = item;
      void _ignored;
      return row;
    });
}

export async function countApprovalInboxPending(actor: Employee): Promise<number> {
  const items = await listApprovalInboxItems(actor);
  return items.length;
}

export async function countAdminHrActionablePending(): Promise<number> {
  const [jobLetters, payslips] = await Promise.all([
    prisma.jobLetterRequest.count({
      where: { status: JobLetterRequestStatus.PENDING },
    }),
    prisma.payslipRequest.count({
      where: { status: PayslipRequestStatus.PENDING },
    }),
  ]);
  return jobLetters + payslips;
}

export async function countBinAttentionPending(actor: Employee): Promise<number> {
  const sites = await listBinFieldSitesForActor(actor);
  return filterAttentionSites(sites).length;
}
