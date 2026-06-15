import { AdminInvoiceManagementSection } from "@/components/admin/AdminInvoiceManagementSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { redirect } from "next/navigation";

export default async function AdminInvoicesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/admin/invoices" });
  const responsibilities = await resolveEmployeeResponsibilitiesForActor(employee);
  const accessContext = buildInvoiceAccessContext(employee, responsibilities);

  if (!canAccessInvoiceManagement(accessContext)) {
    redirect("/staff-dashboard");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Invoice Management"
      subtitle="Track recurring client invoices, due dates, reminders, and submission status."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminInvoiceManagementSection />
      </div>
    </StaffWorkspaceShell>
  );
}
