"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import { formatPayslipMoney } from "@/lib/payslip-archive-service";
import type {
  PayslipImportAuditDto,
  PayslipImportPreview,
} from "@/lib/payslip-import-service";
import { Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function PreviewList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: PayslipImportPreview["matched"];
  emptyLabel: string;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <h3 className="text-base font-bold text-[#ebfbff]">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[#ebfbff]/55">{emptyLabel}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={`${item.rowNumber}-${item.email}-${item.payPeriod}`}
              className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3"
            >
              <p className="font-medium text-[#ebfbff]">
                {item.matchedEmployeeName ?? item.employeeName}
              </p>
              <p className="mt-1 text-xs text-[#ebfbff]/55">{item.email || "No email"}</p>
              <p className="mt-2 text-sm text-[#ebfbff]/70">
                {item.payPeriod} · Gross {formatPayslipMoney(item.grossPay)} · Net{" "}
                {formatPayslipMoney(item.netPay)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PayslipImportSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PayslipImportPreview | null>(null);
  const [auditLogs, setAuditLogs] = useState<PayslipImportAuditDto[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const response = await fetch("/api/hr/payslip-import/audit");
      if (!response.ok) {
        throw new Error("Unable to load import history.");
      }
      const data = (await response.json()) as { logs: PayslipImportAuditDto[] };
      setAuditLogs(data.logs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load import history.");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreview(null);
    setMessage(null);
    setError(null);
  }

  async function handlePreview() {
    if (!selectedFile) {
      setError("Select a CSV file first.");
      return;
    }

    setPreviewing(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/hr/payslip-import/preview", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        preview?: PayslipImportPreview;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to preview payslip import.");
      }

      setPreview(data.preview ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to preview payslip import.");
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!selectedFile) {
      setError("Select a CSV file first.");
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/hr/payslip-import/confirm", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        recordsImported?: number;
        recordsUpdated?: number;
        recordsSkipped?: number;
        unmatchedEmployees?: string[];
        recordsArchived?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to import payslip CSV.");
      }

      setMessage(
        `Import complete: ${data.recordsImported ?? 0} created, ${data.recordsUpdated ?? 0} updated, ${data.recordsSkipped ?? 0} skipped, ${data.recordsArchived ?? 0} archived.`,
      );
      setPreview(null);
      setSelectedFile(null);
      await loadAuditLogs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import payslip CSV.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/hr/payslip-administration"
        className="inline-flex text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
      >
        Back to Payslip Administration
      </Link>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Upload Payslip CSV</h2>
        <p className="mt-2 text-sm text-[#ebfbff]/55">
          Export your monthly payroll spreadsheet as CSV, upload it here, preview the
          results, then confirm to save payslips into Neon.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Select File
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px]"
            disabled={!selectedFile || previewing}
            onClick={() => void handlePreview()}
          >
            {previewing ? "Previewing…" : "Preview Import"}
          </Button>
        </div>

        {selectedFile ? (
          <p className="mt-4 text-sm text-[#ebfbff]/70">
            Selected file: <span className="font-medium text-[#ebfbff]">{selectedFile.name}</span>
          </p>
        ) : null}

        {preview ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pay Period" value={preview.payPeriods.join(", ") || "—"} />
            <StatCard label="Total Rows" value={String(preview.totalRows)} />
            <StatCard label="Matched Employees" value={String(preview.matchedCount)} />
            <StatCard label="Unmatched Employees" value={String(preview.unmatchedCount)} />
            <StatCard label="Duplicate Payslips" value={String(preview.duplicateCount)} />
          </div>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <PreviewList
              title="Matched Employees"
              items={preview.matched.filter((item) => !item.existingPayslipId)}
              emptyLabel="No new matched rows."
            />
            <PreviewList
              title="Duplicate Records"
              items={preview.duplicates}
              emptyLabel="No duplicate employee + pay period records."
            />
            <PreviewList
              title="Unmatched Employees"
              items={preview.unmatched}
              emptyLabel="All rows matched employees."
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="min-h-[48px]"
              disabled={importing || preview.matchedCount === 0}
              onClick={() => void handleConfirmImport()}
            >
              {importing ? "Importing…" : "Confirm Import"}
            </Button>
            <p className="self-center text-sm text-[#ebfbff]/55">
              Matched rows will be created or updated. Unmatched rows are skipped.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#ebfbff]">Import Audit Log</h2>
        {loadingAudit ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading import history…
          </div>
        ) : auditLogs.length === 0 ? (
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
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-[#ebfbff]/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#ebfbff]">{value}</p>
    </div>
  );
}
