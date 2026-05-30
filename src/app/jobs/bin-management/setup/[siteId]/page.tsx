import { BinSetupForm } from "@/components/bin-service/BinSetupForm";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { getBinServiceSite } from "@/lib/bin-service/service";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SetupPageProps = {
  params: Promise<{ siteId: string }>;
};

export default async function BinSetupPage({ params }: SetupPageProps) {
  await requireStaffAccess();

  const { siteId } = await params;
  const site = await getBinServiceSite(siteId);

  if (!site) {
    notFound();
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Job Management · Bin Management"
      title="Bin Service Setup"
      subtitle={`Configure rotation schedule and expected bin counts for ${site.name}.`}
    >
      <div className="mb-6">
        <Link
          href="/jobs/bin-management"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Bin Management
        </Link>
      </div>

      <BinSetupForm
        siteId={site.id}
        siteName={site.name}
        initial={
          site.setup
            ? {
                expectedRegularBins: site.setup.expectedRegularBins,
                expectedNewBins: site.setup.expectedNewBins,
                weekPattern: site.setup.weekPattern,
                serviceDay: site.setup.serviceDay,
                assignedTechnicianId: site.setup.assignedTechnicianId,
                accessInstructions: site.setup.accessInstructions,
                contactName: site.setup.contactName,
                contactPhone: site.setup.contactPhone,
                signatureRequired: site.setup.signatureRequired,
                active: site.setup.active,
              }
            : null
        }
      />
    </StaffWorkspaceShell>
  );
}
