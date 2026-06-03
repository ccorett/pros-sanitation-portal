import { PoliciesSection } from "@/components/policies/PoliciesSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function PoliciesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/policies" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Policies"
      title="Company Policies"
      subtitle="Review and acknowledge required policies."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <PoliciesSection />
    </StaffWorkspaceShell>
  );
}
