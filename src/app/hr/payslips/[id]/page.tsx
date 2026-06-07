import { PayslipDetailSection } from "@/components/hr/PayslipDetailSection";
import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { getPayslipDetailForActor } from "@/lib/payslip-archive-service";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HrPayslipDetailPage({ params }: PageProps) {
  const { employee } = await requireStaffAccess({ pathname: "/hr" });
  const { id } = await params;
  const payslip = await getPayslipDetailForActor(id, employee);

  if (!payslip) {
    notFound();
  }

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Payslip Detail"
      subtitle="Review pay period totals and breakdowns."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <PayslipDetailSection payslip={payslip} />
    </StaffWorkspaceShell>
  );
}
