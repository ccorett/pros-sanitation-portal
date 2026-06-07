"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import {
  formatPayslipMoney,
  type PayslipArchiveDto,
} from "@/lib/payslip-archive-service";
import { Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function AdminPayslipArchiveSection() {
  const [payslips, setPayslips] = useState<PayslipArchiveDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [employeePublicId, setEmployeePublicId] = useState("");
  const [payPeriod, setPayPeriod] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayslips = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/payslip-archive");
      if (!response.ok) {
        throw new Error("Unable to load payslip archive.");
      }
      const data = (await response.json()) as { payslips: PayslipArchiveDto[] };
      setPayslips(data.payslips);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load payslip archive.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayslips();
  }, [loadPayslips]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/payslip-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeePublicId,
          payPeriod,
          fileName,
          fileUrl,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add payslip record.");
      }
      setEmployeePublicId("");
      setPayPeriod("");
      setFileName("");
      setFileUrl("");
      setMessage("Payslip record added.");
      await loadPayslips();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to add payslip record.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/payslip-archive/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to delete payslip record.");
      }
      setMessage("Payslip record removed.");
      await loadPayslips();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete payslip record.",
      );
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#ebfbff]">Payslip Archive</h2>
          <p className="text-sm text-[#ebfbff]/55">
            View all payslip records including archived periods, or attach legacy PDF records.
          </p>
        </div>
        <Link
          href="/hr/payslip-administration/import"
          className="inline-flex min-h-[48px] items-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
        >
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          Import Payslips
        </Link>
      </div>

      <form onSubmit={handleCreate} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#ebfbff]">Add Legacy PDF Record</h3>
        <p className="text-sm text-[#ebfbff]/55">
          Link a document URL (PDF hosted on your file store or CDN) to an employee.
        </p>
        <label className="block">
          <span className={authLabelClassName}>Employee ID (e.g. PS-EMP-001)</span>
          <input
            value={employeePublicId}
            onChange={(e) => setEmployeePublicId(e.target.value)}
            className={`${authInputClassName} mt-2`}
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>Pay period</span>
          <input
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value)}
            className={`${authInputClassName} mt-2`}
            placeholder="March 2026"
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>File name</span>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className={`${authInputClassName} mt-2`}
            placeholder="payslip-march-2026.pdf"
            required
          />
        </label>
        <label className="block">
          <span className={authLabelClassName}>File URL</span>
          <input
            type="url"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className={`${authInputClassName} mt-2`}
            placeholder="https://..."
            required
          />
        </label>
        <Button type="submit" disabled={submitting} className="min-h-[48px]">
          {submitting ? "Saving…" : "Add Payslip"}
        </Button>
      </form>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading payslip records…
        </div>
      ) : payslips.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No payslip records yet.
        </div>
      ) : (
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#ebfbff]/10 bg-[#0c151d]/50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Employee</th>
                  <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Pay Period</th>
                  <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Net Pay</th>
                  <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Status</th>
                  <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.id} className="border-b border-[#ebfbff]/10 last:border-0">
                    <td className="px-4 py-3 text-[#ebfbff]">{payslip.employeeName}</td>
                    <td className="px-4 py-3 text-[#ebfbff]/80">{payslip.payPeriod}</td>
                    <td className="px-4 py-3 text-[#ebfbff]/80">
                      {formatPayslipMoney(payslip.netPay)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          payslip.archived
                            ? "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/70"
                            : "border-[#6cc801]/30 bg-[#6cc801]/10 text-[#6cc801]"
                        }`}
                      >
                        {payslip.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <Link
                          href={`/hr/payslips/${payslip.id}`}
                          className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
                        >
                          View
                        </Link>
                        {payslip.fileUrl ? (
                          <a
                            href={payslip.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#ebfbff]/55 hover:text-[#00c6ff]"
                          >
                            PDF
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[36px] px-3 text-xs"
                          onClick={() => void handleDelete(payslip.id)}
                        >
                          Delete
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-[#ebfbff]/45">
                        {payslip.importedAt
                          ? `Imported ${formatDisplayDate(payslip.importedAt)}`
                          : payslip.uploadedAt
                            ? `Uploaded ${formatDisplayDate(payslip.uploadedAt)}`
                            : null}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
