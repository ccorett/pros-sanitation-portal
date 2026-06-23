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
import { Suspense } from "react";

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
      subtitle="Track recurring invoices, due dates, invoice status and alerts."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <AdminBackLink />
        <Suspense
          fallback={
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
              Loading invoice management…
            </div>
          }
        >
          <AdminInvoiceManagementSection />
        </Suspense>
      </div>
    </StaffWorkspaceShell>
  );
}
