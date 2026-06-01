import { AdminBinAttentionSection } from "@/components/admin/AdminBinAttentionSection";
import { AdminBinDueOverdueTable } from "@/components/admin/AdminBinDueOverdueTable";
import { AdminBinManagementSection } from "@/components/admin/AdminBinManagementSection";
import { AdminBinRouteLocationsTable } from "@/components/admin/AdminBinRouteLocationsTable";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { requireStaffAccess } from "@/lib/require-staff-access";

export default async function AdminBinServicesPage() {
  await requireStaffAccess();

  return (
    <StaffWorkspaceShell
      sectionLabel="Admin"
      title="Bin Services"
      subtitle="Sites, route locations, due/overdue bins, setup, and technician updates."
    >
      <div className="space-y-12">
        <AdminBackLink />
        <AdminBinManagementSection />
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#ebfbff]">Needs Attention</h2>
            <p className="mt-1 text-sm text-[#ebfbff]/55">
              Cannot access and issue reports from technicians.
            </p>
          </div>
          <AdminBinAttentionSection />
        </section>
        <AdminBinDueOverdueTable />
        <AdminBinRouteLocationsTable />
      </div>
    </StaffWorkspaceShell>
  );
}
