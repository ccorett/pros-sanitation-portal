import { CleaningJobsTable } from "@/components/jobs/CleaningJobsTable";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  canActorActOnCleaningJob,
  listCleaningJobsForActor,
} from "@/lib/cleaning-jobs-service";
import {
  canAccessBinManagement,
  isBinOperationalRole,
  isManagerOrAbove,
} from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { redirect } from "next/navigation";
import { ArrowRight, Recycle, Smartphone } from "lucide-react";
import Link from "next/link";

export default async function JobsPage() {
  const { employee, accessContext } = await requireStaffAccess({ pathname: "/jobs" });
  const jobs = await listCleaningJobsForActor(employee, accessContext);

  const showCleaningSection =
    !isBinOperationalRole(accessContext) || jobs.length > 0;

  const showBinManagementCard =
    canAccessBinManagement(accessContext) &&
    !isBinOperationalRole(accessContext) &&
    isManagerOrAbove(employee.accessLevel);

  if (isBinOperationalRole(accessContext) && jobs.length === 0) {
    redirect("/jobs/bin-management");
  }

  const canPerformActions = jobs.some((job) => canActorActOnCleaningJob(employee, job));

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
      {showBinManagementCard ? (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <GlassCard className="flex h-full flex-col border border-[#259f00]/20">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
              <Recycle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">Bin Management</h2>
            <p className="mt-2 flex-1 text-sm text-[#ebfbff]/55">
              Recurring sanitary bin service routes. Track expected bin counts,
              rotation status, and technician completions by site.
            </p>
            <div className="mt-6 grid gap-2">
              <Link
                href="/jobs/bin-management"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20"
              >
                Bin Service Overview
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/jobs/bin-management/today"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                Today&apos;s Bin Jobs
              </Link>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {showCleaningSection ? (
        <>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#ebfbff]/50">
            Cleaning Jobs
          </h2>
          <CleaningJobsTable jobs={jobs} canPerformActions={canPerformActions} />
        </>
      ) : null}
    </StaffWorkspaceShell>
  );
}
