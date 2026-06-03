"use client";

import { Button } from "@/components/ui/Button";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { PayslipArchiveDto } from "@/lib/payslip-archive-service";
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
      <form onSubmit={handleCreate} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Add Payslip Record</h2>
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
        <div className="space-y-3">
          {payslips.map((payslip) => (
            <article key={payslip.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">
                    {payslip.payPeriod} — {payslip.employeeName || payslip.employeeId}
                  </h3>
                  <p className="mt-1 text-xs text-[#ebfbff]/45">
                    {payslip.fileName} · Uploaded {formatDisplayDate(payslip.uploadedAt)} by{" "}
                    {payslip.uploadedBy}
                  </p>
                  <a
                    href={payslip.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-[#00c6ff] hover:underline"
                  >
                    {payslip.fileUrl}
                  </a>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px] text-xs"
                  onClick={() => void handleDelete(payslip.id)}
                >
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
