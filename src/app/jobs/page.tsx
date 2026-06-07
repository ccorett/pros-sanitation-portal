import { CleaningJobsTable } from "@/components/jobs/CleaningJobsTable";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  canActorActOnCleaningJob,
  listCleaningJobsForActor,
} from "@/lib/cleaning-jobs-service";
import { canAccessDelivery, isBinOperationalRole } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function JobsPage() {
  const { employee, accessContext } = await requireStaffAccess({ pathname: "/jobs" });

  if (isBinOperationalRole(accessContext)) {
    redirect("/jobs/bin-management");
  }

  const jobs = await listCleaningJobsForActor(employee, accessContext);
  const canPerformActions = jobs.some((job) => canActorActOnCleaningJob(employee, job));
  const showDelivery = canAccessDelivery(accessContext);

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title="Job Management"
      subtitle={
        jobs.length > 0
          ? "Assigned cleaning service jobs from Neon."
          : "No cleaning jobs are assigned to your account."
      }
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      {showDelivery ? (
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/jobs/delivery"
            className="inline-flex min-h-[48px] items-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-5 py-3 text-sm font-semibold text-[#ebfbff]"
          >
            Delivery
          </Link>
        </div>
      ) : null}

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#ebfbff]/50">
        Cleaning Jobs
      </h2>
      <CleaningJobsTable jobs={jobs} canPerformActions={canPerformActions} />
    </StaffWorkspaceShell>
  );
}
