import {
  CleaningJobStatus,
  EquipmentRequestStatus,
  PayslipRequestStatus,
  VacationFinalStatus,
  type Employee,
} from "@prisma/client";
import { countUnacknowledgedPolicies } from "@/lib/policy-service";
import { prisma } from "@/lib/prisma";
import { listBinFieldJobsToday } from "@/lib/bin-service/field-service";

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
};

export async function getDashboardSummary(
  employee: Employee,
): Promise<DashboardSummary> {
  const [
    assignedCleaningJobs,
    pendingVacationRequests,
    pendingEquipmentRequests,
    pendingPayslipRequests,
    availablePayslips,
    unacknowledgedPolicies,
    todaysBinJobs,
  ] = await Promise.all([
    prisma.job.count({
      where: {
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
      where: {
        employeeId: employee.id,
        finalStatus: { in: OPEN_VACATION_STATUSES },
      },
    }),
    prisma.equipmentRequest.count({
      where: {
        requestedById: employee.id,
        status: EquipmentRequestStatus.PENDING,
      },
    }),
    prisma.payslipRequest.count({
      where: {
        employeeId: employee.id,
        status: PayslipRequestStatus.PENDING,
      },
    }),
    prisma.payslip.count({ where: { employeeId: employee.id } }),
    countUnacknowledgedPolicies(employee.id),
    listBinFieldJobsToday(employee).then((jobs) => jobs.length),
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
  };
}
