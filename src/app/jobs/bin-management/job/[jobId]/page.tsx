import { BinLocationJobClient } from "@/components/bin-service/BinLocationJobClient";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { getSeedLocations } from "@/lib/bin-locations-storage";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type BinJobPageProps = {
  params: Promise<{ jobId: string }>;
};

export default async function BinJobPage({ params }: BinJobPageProps) {
  const { employee } = await requireStaffAccess({
    pathname: "/jobs/bin-management",
  });

  const { jobId } = await params;
  const location = getSeedLocations().find((item) => item.id === jobId);

  if (!location) {
    notFound();
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management · Bin Management"
      title={location.location}
      subtitle={`${location.newBins} new · ${location.regularBins} regular bins`}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/jobs/bin-management/today"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Today&apos;s Bin Jobs
        </Link>
      </div>

      <BinLocationJobClient locationId={jobId} />
    </StaffWorkspaceShell>
  );
}
