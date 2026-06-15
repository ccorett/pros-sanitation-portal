import { AdminHumanResourcesSection } from "@/components/admin/AdminHumanResourcesSection";
import { AdminPayslipArchiveSection } from "@/components/admin/AdminPayslipArchiveSection";
import { AdminPoliciesSection } from "@/components/admin/AdminPoliciesSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminHumanResourcesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Human Resources"
      subtitle="Vacation, job letter, payslip requests, payslip archive, and policy management."
          employeeId={employee.id}
          accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminHumanResourcesSection />
        <AdminPayslipArchiveSection />
        <section id="policy-management" className="scroll-mt-6">
          <AdminPoliciesSection />
        </section>
      </div>
    </StaffWorkspaceShell>
  );
}
