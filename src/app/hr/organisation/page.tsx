import { HrOrganisationView } from "@/components/hr/HrOrganisationView";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canAccessHrOrganisation } from "@/lib/hr-organisation-service";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HrOrganisationPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/hr/organisation",
  });

  if (!canAccessHrOrganisation(employee)) {
    redirect("/staff-dashboard");
  }

  const subtitle = isManagerOrAbove(employee.accessLevel)
    ? "All locations with supervisors and employees assigned."
    : `Team structure for ${employee.locationAssignment ?? "your location"}.`;

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Team Structure"
      layoutWidth="wide"
      subtitle={subtitle}
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="mb-6">
        <Link
          href="/hr"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Human Resources
        </Link>
      </div>

      <HrOrganisationView />
    </StaffWorkspaceShell>
  );
}
