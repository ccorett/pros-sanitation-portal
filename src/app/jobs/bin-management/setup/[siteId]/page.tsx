import { BinSetupForm } from "@/components/bin-service/BinSetupForm";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { getBinServiceSite } from "@/lib/bin-service/service";
import { canManageBinLocationSetup } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type SetupPageProps = {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ from?: string }>;
};

export default async function BinSetupPage({ params, searchParams }: SetupPageProps) {
  const { employee } = await requireStaffAccess({
    pathname: "/jobs/bin-management",
  });

  if (!canManageBinLocationSetup(employee.accessLevel)) {
    redirect("/jobs/bin-management");
  }

  const { siteId } = await params;
  const { from } = await searchParams;
  const site = await getBinServiceSite(siteId);

  if (!site) {
    notFound();
  }

  const backHref = from === "admin" ? "/admin" : "/jobs/bin-management";
  const backLabel = from === "admin" ? "Back to Admin" : "Back to Bin Management";

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin · Bin Management"
      title="Bin Service Setup"
      subtitle={`Configure rotation schedule and expected bin counts for ${site.name}.`}
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      </div>

      <BinSetupForm
        siteId={site.id}
        siteName={site.name}
        returnPath={backHref}
        initial={
          site.setup
            ? {
                expectedRegularBins: site.setup.expectedRegularBins,
                expectedNewBins: site.setup.expectedNewBins,
                weekPattern: site.setup.weekPattern,
                serviceDay: site.setup.serviceDay,
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
