import { StaffWorkspaceShell } from "@/components/layout/StaffWorkspaceShell";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import { listPayslipImportAuditLogs } from "@/lib/payslip-import-service";
import { requireStaffAccess } from "@/lib/require-staff-access";
import { ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

export default async function PayslipAdministrationPage() {
  const { employee } = await requireStaffAccess({
    pathname: "/hr/payslip-administration",
  });

  const auditLogs = await listPayslipImportAuditLogs(10);

  return (
    <StaffWorkspaceShell
      sectionLabel="Human Resources"
      title="Payslip Administration"
      subtitle="Upload monthly payroll CSV files and review import history."
      employeeId={employee.id}
      accessLevel={employee.accessLevel}
      operationalGroup={employee.operationalGroup}
      companyEmail={employee.companyEmail}
    >
      <div className="space-y-6">
        <Link
          href="/hr"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Human Resources
        </Link>

        <div className="glass-card rounded-2xl border border-[#00c6ff]/25 p-5 sm:p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00c6ff]/15 text-[#00c6ff]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#ebfbff]">Import Payslips</h2>
          <p className="mt-2 text-sm text-[#ebfbff]/65">
            Export your payroll spreadsheet as CSV, upload it through the platform,
            preview matched and unmatched employees, then confirm to save payslips
            into Neon.
          </p>
          <Link
            href="/hr/payslip-administration/import"
            className="mt-4 inline-flex min-h-[48px] items-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
          >
            Open Import Payslips
          </Link>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#ebfbff]">Recent Import Activity</h2>
          {auditLogs.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
              No payslip imports recorded yet.
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#ebfbff]/10 bg-[#0c151d]/50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Imported By</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Date</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">File</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Imported</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Updated</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#ebfbff]/10 last:border-0">
                        <td className="px-4 py-3 text-[#ebfbff]">{log.importedByName}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {formatDisplayDate(log.importedAt)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{log.fileName}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{log.recordsImported}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{log.recordsUpdated}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{log.recordsSkipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </StaffWorkspaceShell>
  );
}
