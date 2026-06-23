import { AdminInvoiceNotificationsSection } from "@/components/admin/AdminInvoiceNotificationsSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import {
  buildInvoiceAccessContext,
  canAccessInvoiceManagement,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { redirect } from "next/navigation";

export default async function AdminInvoiceNotificationsPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/admin/invoice-notifications",
  });
  const responsibilities = await resolveEmployeeResponsibilitiesForActor(employee);
  const accessContext = buildInvoiceAccessContext(employee, responsibilities);

  if (!canAccessInvoiceManagement(accessContext)) {
    redirect("/staff-dashboard");
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Invoice Notifications"
      subtitle="Platform alerts for invoice due dates, generation, and submission."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <AdminInvoiceNotificationsSection />
      </div>
    </StaffWorkspaceShell>
  );
}
