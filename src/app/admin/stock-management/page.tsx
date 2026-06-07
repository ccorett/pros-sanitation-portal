import { AdminStockManagementSection } from "@/components/admin/AdminStockManagementSection";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { canAccessAdminModule } from "@/lib/access-levels";
import { isManagerOrAbove } from "@/lib/operational-access";
import { requireStaffAccess } from "@/lib/require-staff-access";
import Link from "next/link";

export default async function AdminStockManagementPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/admin/stock-management",
  });
  const canEditStock = canAccessAdminModule(employee.accessLevel);
  const canImportExport = isManagerOrAbove(employee.accessLevel);

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Stock Management"
      subtitle="Inventory list and purchasing list. Edits sync with Equipment & Supplies for all staff."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        {canEditStock ? (
          <AdminBackLink />
        ) : (
          <Link
            href="/equipment-supplies"
            className="inline-flex text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
          >
            Back to Equipment & Supplies
          </Link>
        )}
        <AdminStockManagementSection
          canEditStock={canEditStock}
          canImportExport={canImportExport}
        />
      </div>
    </StaffWorkspaceShell>
  );
}
