"use client";

import { Button } from "@/components/ui/Button";
import { formatEditTimestamp } from "@/lib/admin-format";
import {
  inventoryImportCategoryHint,
  type InventoryImportAuditDto,
  type InventoryImportPreview,
} from "@/lib/inventory-import-service";
import { Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function InventoryImportSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InventoryImportPreview | null>(null);
  const [auditLogs, setAuditLogs] = useState<InventoryImportAuditDto[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const response = await fetch("/api/inventory/import/audit");
      if (!response.ok) {
        throw new Error("Unable to load import history.");
      }
      const data = (await response.json()) as { logs: InventoryImportAuditDto[] };
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

      const response = await fetch("/api/inventory/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        preview?: InventoryImportPreview;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to preview inventory import.");
      }

      setPreview(data.preview ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to preview inventory import.");
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

      const response = await fetch("/api/inventory/import/confirm", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        createdCount?: number;
        updatedCount?: number;
        skippedCount?: number;
        errorCount?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to import inventory CSV.");
      }

      setMessage(
        `Import complete: ${data.createdCount ?? 0} created, ${data.updatedCount ?? 0} updated, ${data.skippedCount ?? 0} skipped, ${data.errorCount ?? 0} errors.`,
      );
      setPreview(null);
      setSelectedFile(null);
      await loadAuditLogs();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import inventory CSV.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Upload Inventory</h2>
        <p className="mt-2 text-sm text-[#ebfbff]/55">
          Upload a CSV exported from Stock Management. Supported categories:{" "}
          {inventoryImportCategoryHint()}. Stock Status, Last Updated, and Action
          columns are ignored on import.
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
          {selectedFile ? (
            <span className="text-sm text-[#ebfbff]/60">{selectedFile.name}</span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Total Rows", preview.totalRows],
              ["New Items", preview.newCount],
              ["Updated Items", preview.updateCount],
              ["Skipped Rows", preview.skippedCount],
              ["Errors", preview.errorCount],
            ].map(([label, value]) => (
              <div key={label} className="glass-card rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-[#ebfbff]/45">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-bold text-[#ebfbff]">{value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card portal-table-scroll rounded-2xl">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                  <th className="px-4 py-4 font-semibold">Current Quantity</th>
                  <th className="px-4 py-4 font-semibold">New Quantity</th>
                  <th className="px-4 py-4 font-semibold sm:px-6">Notes/Error</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={`${row.rowNumber}-${row.itemName}`}
                    className="border-b border-[#ebfbff]/5 last:border-b-0"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {row.itemName}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{row.action}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {row.currentQuantity ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {row.newQuantity ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70 sm:px-6">
                      {row.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            className="min-h-[48px]"
            disabled={
              importing ||
              preview.newCount + preview.updateCount === 0
            }
            onClick={() => void handleConfirmImport()}
          >
            {importing ? "Importing…" : "Confirm Import"}
          </Button>
        </div>
      ) : null}

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-[#ebfbff]">Import History</h3>
        {loadingAudit ? (
          <p className="mt-3 text-sm text-[#ebfbff]/55">Loading import history…</p>
        ) : auditLogs.length === 0 ? (
          <p className="mt-3 text-sm text-[#ebfbff]/55">No inventory imports yet.</p>
        ) : (
          <div className="mt-4 portal-table-scroll overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-3 py-3 font-semibold">File</th>
                  <th className="px-3 py-3 font-semibold">Imported By</th>
                  <th className="px-3 py-3 font-semibold">Imported At</th>
                  <th className="px-3 py-3 font-semibold">Created</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-3 py-3 font-semibold">Skipped</th>
                  <th className="px-3 py-3 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#ebfbff]/5 last:border-b-0"
                  >
                    <td className="px-3 py-3 text-[#ebfbff]">{log.fileName}</td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">{log.importedBy}</td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">
                      {formatEditTimestamp(log.importedAt)}
                    </td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">{log.createdCount}</td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">{log.updatedCount}</td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">{log.skippedCount}</td>
                    <td className="px-3 py-3 text-[#ebfbff]/70">{log.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
