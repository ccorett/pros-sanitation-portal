import { PayslipImportSection } from "@/components/hr/PayslipImportSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function PayslipImportPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/hr/payslip-administration",
  });

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Import Payslips"
      subtitle="Upload a monthly payroll CSV, preview matches, and confirm the import."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <PayslipImportSection />
    </StaffWorkspaceShell>
  );
}
