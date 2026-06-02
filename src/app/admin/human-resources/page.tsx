import { AdminHumanResourcesSection } from "@/components/admin/AdminHumanResourcesSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminHumanResourcesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Human Resources"
      subtitle="Vacation, job letter, and payslip request approvals."
          accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminHumanResourcesSection />
      </div>
    </StaffWorkspaceShell>
  );
}
