import { CleaningJobDetailActions } from "@/components/jobs/CleaningJobDetailActions";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  cleaningJobPriorityBadgeClass,
  cleaningJobPriorityLabel,
  cleaningJobStatusBadgeClass,
  cleaningJobStatusLabel,
  formatCleaningJobDate,
} from "@/lib/cleaning-jobs-display";
import { CleaningJobServiceLogHistory } from "@/components/jobs/CleaningJobServiceLogHistory";
import {
  canActorAccessCleaningJob,
  canActorActOnCleaningJob,
  getCleaningJobById,
  listJobServiceLogsForJob,
} from "@/lib/cleaning-jobs-service";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type CleaningJobPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CleaningJobPage({ params }: CleaningJobPageProps) {
  const { employee, accessContext } = await requireStaffAccess({ pathname: "/jobs" });
  const { id } = await params;
  const job = await getCleaningJobById(id);

  if (!job) {
    notFound();
  }

  const allowed = await canActorAccessCleaningJob(employee, accessContext, job);
  if (!allowed) {
    return (
      <StaffWorkspaceShell
        sectionLabel="Job Management"
        title="Access Restricted"
        subtitle="You do not have access to this job location."
        employeeId={employee.id}
        accessLevel={employee.accessLevel}
        operationalGroup={employee.operationalGroup}
        companyEmail={employee.companyEmail}
      >
        <div className="mb-6">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Jobs
          </Link>
        </div>
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/70">
          You do not have access to this job location.
        </div>
      </StaffWorkspaceShell>
    );
  }

  const logs = await listJobServiceLogsForJob(job.id);
  const canPerformActions = canActorActOnCleaningJob(employee, job);

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management"
      title={job.title}
      subtitle={`${job.clientLocation} · ${cleaningJobStatusLabel(job.status)}`}
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Jobs
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cleaningJobStatusBadgeClass(job.status)}`}
          >
            {cleaningJobStatusLabel(job.status)}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cleaningJobPriorityBadgeClass(job.priority)}`}
          >
            {cleaningJobPriorityLabel(job.priority)}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Location</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">{job.clientLocation}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Service Type</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">{job.serviceType}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Assigned To</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">
              {job.assignedEmployeeName ?? "Unassigned"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Assigned By</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">{job.assignedBy}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Scheduled Date</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">
              {formatCleaningJobDate(job.scheduledDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[#ebfbff]/45">Due Date</dt>
            <dd className="mt-1 text-sm text-[#ebfbff]">
              {formatCleaningJobDate(job.dueDate)}
            </dd>
          </div>
        </dl>

        {job.notes ? (
          <p className="mt-6 text-sm leading-relaxed text-[#ebfbff]/60">{job.notes}</p>
        ) : null}

        <CleaningJobDetailActions job={job} canPerformActions={canPerformActions} />
      </div>

      <CleaningJobServiceLogHistory logs={logs} />
    </StaffWorkspaceShell>
  );
}
