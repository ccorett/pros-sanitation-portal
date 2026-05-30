import { TechnicianJobCard } from "@/components/bin-service/TechnicianJobCard";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  enrichJobWithStatus,
  listTechnicianBinJobs,
} from "@/lib/bin-service/service";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function BinJobsTodayPage() {
  const { employee } = await requireStaffAccess();
  const jobs = await listTechnicianBinJobs(employee.id);

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management · Bin Management"
      title="Today's Bin Jobs"
      subtitle="Your assigned sanitary bin service stops. Overdue and unresolved jobs stay at the top."
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/jobs/bin-management"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Bin Management
        </Link>
        <Link
          href="/jobs"
          className="text-sm text-[#ebfbff]/55 hover:text-[#ebfbff]"
        >
          Job Management
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-[#ebfbff]/60">
            No bin jobs assigned for you right now. Check back on your service day
            or contact your supervisor.
          </p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-xl gap-4">
          {jobs.map((job) => {
            const { rotation } = enrichJobWithStatus(job);
            return (
              <TechnicianJobCard key={job.id} job={job} rotation={rotation} />
            );
          })}
        </div>
      )}
    </StaffWorkspaceShell>
  );
}
