"use client";

import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { formatEditTimestamp } from "@/lib/admin-format";
import type {
  BinLocationImportAuditDto,
  BinLocationImportPreview,
} from "@/lib/bin-location-import-service";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function BinLocationImportSection() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BinLocationImportPreview | null>(null);
  const [auditLogs, setAuditLogs] = useState<BinLocationImportAuditDto[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const response = await fetch("/api/bin-service/import/audit");
      if (!response.ok) {
        throw new Error("Unable to load import history.");
      }
      const data = (await response.json()) as { logs: BinLocationImportAuditDto[] };
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

      const response = await fetch("/api/bin-service/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        preview?: BinLocationImportPreview;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to preview bin location import.");
      }

      setPreview(data.preview ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to preview bin location import.",
      );
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

      const response = await fetch("/api/bin-service/import/confirm", {
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
        throw new Error(data.error ?? "Unable to import bin locations.");
      }

      setMessage(
        `Import complete: ${data.createdCount ?? 0} created, ${data.updatedCount ?? 0} updated, ${data.skippedCount ?? 0} skipped, ${data.errorCount ?? 0} errors.`,
      );
      setPreview(null);
      setSelectedFile(null);
      await loadAuditLogs();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import bin locations.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div id="import-bin-locations" className="space-y-6 scroll-mt-24">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Import Bin Locations</h2>
        <p className="mt-2 text-sm text-[#ebfbff]/55">
          Upload a CSV location sheet with columns: Location, New Bins Expected,
          Regular Bins Expected, Total Bins, Last Service Date, Next Service Date,
          Status, Notes. The Action column is ignored. Save Excel files as CSV
          before uploading. Existing locations are matched by name.
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
              ["New Locations", preview.newCount],
              ["Updated Locations", preview.updateCount],
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

          <DesktopTableView>
            <div className="glass-card portal-table-scroll rounded-2xl">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
                    <th className="px-4 py-4 font-semibold">Action</th>
                    <th className="px-4 py-4 font-semibold">New Bins Expected</th>
                    <th className="px-4 py-4 font-semibold">Regular Bins Expected</th>
                    <th className="px-4 py-4 font-semibold">Total Bins</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Error / Warning</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr
                      key={`${row.rowNumber}-${row.location}`}
                      className="border-b border-[#ebfbff]/5 last:border-b-0"
                    >
                      <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                        {row.location}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">{row.action}</td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {row.expectedNewBins ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {row.expectedRegularBins ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {row.totalBins ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70 sm:px-6">
                        {row.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DesktopTableView>

          <MobileCardStack>
            {preview.rows.map((row) => (
              <MobileRecordCard
                key={`${row.rowNumber}-${row.location}`}
                title={row.location}
                subtitle={row.action}
                fields={[
                  { label: "New Bins Expected", value: row.expectedNewBins ?? "—" },
                  {
                    label: "Regular Bins Expected",
                    value: row.expectedRegularBins ?? "—",
                  },
                  { label: "Total Bins", value: row.totalBins ?? "—" },
                ]}
                detailFields={
                  row.notes?.trim()
                    ? [{ label: "Error / Warning", value: row.notes }]
                    : undefined
                }
              />
            ))}
          </MobileCardStack>

          <Button
            type="button"
            className="min-h-[48px]"
            disabled={
              importing || preview.newCount + preview.updateCount === 0
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
          <p className="mt-3 text-sm text-[#ebfbff]/55">No bin location imports yet.</p>
        ) : (
          <>
            <DesktopTableView className="mt-4">
              <div className="portal-table-scroll overflow-x-auto">
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
            </DesktopTableView>

            <MobileCardStack className="mt-4">
              {auditLogs.map((log) => (
                <MobileRecordCard
                  key={log.id}
                  title={log.fileName}
                  subtitle={log.importedBy}
                  fields={[
                    { label: "Created", value: log.createdCount },
                    { label: "Updated", value: log.updatedCount },
                    { label: "Skipped", value: log.skippedCount },
                    { label: "Errors", value: log.errorCount },
                  ]}
                  detailFields={[
                    {
                      label: "Imported At",
                      value: formatEditTimestamp(log.importedAt),
                    },
                  ]}
                />
              ))}
            </MobileCardStack>
          </>
        )}
      </div>
    </div>
  );
}
