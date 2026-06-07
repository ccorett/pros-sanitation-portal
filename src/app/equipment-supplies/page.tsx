import { InventorySection } from "@/components/equipment-supplies/InventorySection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function EquipmentSuppliesPage() {
  const { employee } = await requireStaffAccess({ pathname: "/equipment-supplies" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Equipment & Supplies"
      title="Equipment & Supplies"
      subtitle="View available stock and submit supply requests."
          employeeId={employee.id}
          accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <InventorySection />
    </StaffWorkspaceShell>
  );
}
