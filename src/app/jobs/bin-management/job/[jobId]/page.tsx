import { BinJobWorkflow } from "@/components/bin-service/BinJobWorkflow";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { binJobInclude } from "@/lib/bin-service/service";
import { prisma } from "@/lib/prisma";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type BinJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function BinJobPage({ params }: BinJobPageProps) {
  const { employee } = await requireStaffAccess();
  const { jobId } = await params;

  const job = await prisma.binServiceJob.findUnique({
    where: { id: jobId },
    include: binJobInclude,
  });

  if (!job) {
    notFound();
  }

  if (job.assignedTechnicianId !== employee.id) {
    redirect("/jobs/bin-management/today");
  }

  if (job.status === "COMPLETED") {
    redirect("/jobs/bin-management/today");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management · Bin Management"
      title={job.site.name}
      subtitle={`${job.site.area ? `${job.site.area} · ` : ""}${job.site.address}`}
    >
      <div className="mb-6">
        <Link
          href="/jobs/bin-management/today"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Today&apos;s Jobs
        </Link>
      </div>

      {job.setup.accessInstructions ? (
        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
            Access instructions
          </p>
          <p className="mt-2 text-sm text-[#ebfbff]/75">
            {job.setup.accessInstructions}
          </p>
        </div>
      ) : null}

      <div className="mx-auto max-w-xl">
        <BinJobWorkflow
          jobId={job.id}
          siteName={job.site.name}
          expectedRegularBins={job.setup.expectedRegularBins}
          expectedNewBins={job.setup.expectedNewBins}
          signatureRequired={job.setup.signatureRequired}
          initialStatus={job.status}
        />
      </div>
    </StaffWorkspaceShell>
  );
}
