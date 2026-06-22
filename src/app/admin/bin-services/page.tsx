import { AdminBinManagementSection } from "@/components/admin/AdminBinManagementSection";
import { BinLocationImportSection } from "@/components/admin/BinLocationImportSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminBinServicesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin/bin-services" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Bin Management"
      subtitle="Search, filter, and manage bin service locations. Import, add, edit, or remove sites."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-12">
        <AdminBackLink />
        <AdminBinManagementSection />
        <BinLocationImportSection />
      </div>
    </StaffWorkspaceShell>
  );
}
