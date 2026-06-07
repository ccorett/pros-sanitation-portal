import { DeliverySection } from "@/components/delivery/DeliverySection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function DeliveryPage() {
  const { employee } = await requireStaffAccess({ pathname: "/jobs/delivery" });

  return (
    <StaffWorkspaceShell
      sectionLabel="Work Locations"
      title="Deliveries"
      subtitle="View delivery requests and track delivery status for drivers and coordinators."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <DeliverySection />
    </StaffWorkspaceShell>
  );
}
