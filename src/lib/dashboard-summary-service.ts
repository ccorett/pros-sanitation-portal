import {
  CleaningJobStatus,
  EquipmentRequestStatus,
  PayslipRequestStatus,
  VacationFinalStatus,
  type Employee,
} from "@prisma/client";
import { canAccessAdminModule } from "@/lib/access-levels";
import { countUnacknowledgedPolicies } from "@/lib/policy-service";
import { isManagerOrAbove } from "@/lib/operational-access";
import { countVisiblePayslipsForEmployee } from "@/lib/payslip-archive-service";
import { prisma } from "@/lib/prisma";
import { listBinFieldJobsToday } from "@/lib/bin-service/field-service";
import {
  getDashboardDeliveryActivity,
  type DashboardDeliveryActivityItem,
} from "@/lib/dashboard-delivery-activity";
import {
  DASHBOARD_INVOICE_ACTIVITY_LINKS,
  type DashboardInvoiceActivityItem,
} from "@/lib/dashboard-invoice-activity";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { getInvoiceAlertSummary } from "@/lib/invoice-service";
import { countUnreadInvoiceNotifications } from "@/lib/invoice-notification-service";

const OPEN_VACATION_STATUSES: VacationFinalStatus[] = [
  VacationFinalStatus.PENDING_SUPERVISOR_REVIEW,
  VacationFinalStatus.PENDING_MANAGER_REVIEW,
];

export type DashboardSummaryMetrics = {
  assignedCleaningJobs: number;
  pendingVacationRequests: number;
  pendingEquipmentRequests: number;
  todaysBinJobs: number;
  unacknowledgedPolicies: number;
  pendingPayslipRequests: number;
  availablePayslips: number;
};

export type DashboardSummary = {
  metrics: DashboardSummaryMetrics;
  deliveryActivity: DashboardDeliveryActivityItem[] | null;
  invoiceActivity: DashboardInvoiceActivityItem[] | null;
};

function canSeeOrganizationActivity(employee: Employee): boolean {
  return (
    isManagerOrAbove(employee.accessLevel) ||
    canAccessAdminModule(employee.accessLevel)
  );
}

async function getDashboardInvoiceActivity(
  employee: Employee,
): Promise<DashboardInvoiceActivityItem[] | null> {
  const responsibilities = await resolveEmployeeResponsibilitiesForActor(employee);
  const accessContext = buildInvoiceAccessContext(employee, responsibilities);

  if (!canAccessInvoiceManagement(accessContext)) {
    return null;
  }

  const [alertSummary, unreadCount] = await Promise.all([
    getInvoiceAlertSummary(),
    countUnreadInvoiceNotifications(),
  ]);

  const counts: Record<DashboardInvoiceActivityItem["key"], number> = {
    invoiceAlerts: unreadCount,
    invoicesDueSoon: alertSummary.dueSoon,
    invoicesDueToday: alertSummary.dueToday,
    overdueInvoices: alertSummary.overdue,
  };

  return DASHBOARD_INVOICE_ACTIVITY_LINKS.map((item) => ({
    ...item,
    count: counts[item.key],
  }));
}

export async function getDashboardSummary(
  employee: Employee,
): Promise<DashboardSummary> {
  const orgWide = canSeeOrganizationActivity(employee);

  const [
    assignedCleaningJobs,
    pendingVacationRequests,
    pendingEquipmentRequests,
    pendingPayslipRequests,
    availablePayslips,
    unacknowledgedPolicies,
    todaysBinJobs,
    deliveryActivity,
    invoiceActivity,
  ] = await Promise.all([
    prisma.job.count({
      where: orgWide
        ? {
            status: {
              in: [
                CleaningJobStatus.PENDING,
                CleaningJobStatus.ASSIGNED,
                CleaningJobStatus.IN_PROGRESS,
                CleaningJobStatus.ISSUE_REPORTED,
              ],
            },
          }
        : {
            assignedEmployeeId: employee.id,
            status: {
              in: [
                CleaningJobStatus.PENDING,
                CleaningJobStatus.ASSIGNED,
                CleaningJobStatus.IN_PROGRESS,
                CleaningJobStatus.ISSUE_REPORTED,
              ],
            },
          },
    }),
    prisma.vacationRequest.count({
      where: orgWide
        ? { finalStatus: { in: OPEN_VACATION_STATUSES } }
        : {
            employeeId: employee.id,
            finalStatus: { in: OPEN_VACATION_STATUSES },
          },
    }),
    prisma.equipmentRequest.count({
      where: orgWide
        ? { status: EquipmentRequestStatus.PENDING }
        : {
            requestedById: employee.id,
            status: EquipmentRequestStatus.PENDING,
          },
    }),
    prisma.payslipRequest.count({
      where: orgWide
        ? { status: PayslipRequestStatus.PENDING }
        : {
            employeeId: employee.id,
            status: PayslipRequestStatus.PENDING,
          },
    }),
    orgWide
      ? prisma.payslip.count({ where: { archived: false } })
      : countVisiblePayslipsForEmployee(employee.id),
    countUnacknowledgedPolicies(employee.id),
    listBinFieldJobsToday(employee).then((jobs) => jobs.length),
    getDashboardDeliveryActivity(employee),
    getDashboardInvoiceActivity(employee),
  ]);

  return {
    metrics: {
      assignedCleaningJobs,
      pendingVacationRequests,
      pendingEquipmentRequests,
      todaysBinJobs,
      unacknowledgedPolicies,
      pendingPayslipRequests,
      availablePayslips,
    },
    deliveryActivity,
    invoiceActivity,
  };
}
