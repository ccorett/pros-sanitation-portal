"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate, jobLetterStatusClass } from "@/lib/hr-mock-data";
import {
  formatPayslipMoney,
  type PayslipArchiveDto,
} from "@/lib/payslip-archive-service";
import type { PayslipRequestDto } from "@/lib/payslip-request-service";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PayslipsSectionProps = {
  viewerEmployeeId: string;
  canSyncPayslips?: boolean;
};

export function PayslipsSection({
  viewerEmployeeId,
  canSyncPayslips = false,
}: PayslipsSectionProps) {
  const [requests, setRequests] = useState<PayslipRequestDto[]>([]);
  const [payslips, setPayslips] = useState<PayslipArchiveDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-requests");
      if (!response.ok) {
        throw new Error("Unable to load payslip requests.");
      }
      const data = (await response.json()) as { requests: PayslipRequestDto[] };
      setRequests(data.requests);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load payslip requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-archive");
      if (!response.ok) {
        throw new Error("Unable to load payslip archive.");
      }
      const data = (await response.json()) as { payslips: PayslipArchiveDto[] };
      setPayslips(data.payslips);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load payslip archive.",
      );
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    void loadArchive();
  }, [loadRequests, loadArchive]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/hr/payslip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriod: payPeriod.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit payslip request.");
      }

      setPayPeriod("");
      setNotes("");
      setMessage("Payslip request submitted. Status: Pending.");
      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit payslip request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync() {
    setMessage(null);
    setSyncing(true);

    try {
      const response = await fetch("/api/hr/payslip-sync", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        recordsImported?: number;
        recordsUpdated?: number;
        employeesNotMatched?: string[];
        recordsArchived?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sync payslips.");
      }

      const unmatched =
        data.employeesNotMatched && data.employeesNotMatched.length > 0
          ? ` · ${data.employeesNotMatched.length} not matched`
          : "";

      setMessage(
        `Sync complete: ${data.recordsImported ?? 0} imported, ${data.recordsUpdated ?? 0} updated, ${data.recordsArchived ?? 0} archived${unmatched}.`,
      );
      await loadArchive();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to sync payslips.",
      );
    } finally {
      setSyncing(false);
    }
  }

  const ownPayslips = payslips.filter((payslip) => payslip.employeeId === viewerEmployeeId);
  const historyPayslips = canSyncPayslips ? payslips : ownPayslips;
  const recentPayslip = ownPayslips[0] ?? null;

  return (
    <div className="space-y-8">
      {canSyncPayslips ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#ebfbff]/55">
            Import the latest payroll sheet data into Neon.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[48px]"
            disabled={syncing}
            onClick={() => void handleSync()}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {syncing ? "Syncing…" : "Sync Payslips"}
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#ebfbff]">Request Payslip</h2>
          <p className="text-sm text-[#ebfbff]/55">
            Request a duplicate or missing payslip for a specific pay period.
          </p>

          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Pay Period</span>
            <input
              type="text"
              value={payPeriod}
              onChange={(event) => setPayPeriod(event.target.value)}
              placeholder="e.g. March 2026"
              className="mt-2 w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
              placeholder="Reason for the request"
            />
          </label>

          <Button
            type="submit"
            fullWidth
            className="min-h-[56px] text-base"
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit Payslip Request"}
          </Button>
        </form>

        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#ebfbff]">Recent Payslip</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Your most recent synced pay period.
          </p>

          {archiveLoading ? (
            <p className="mt-6 text-sm text-[#ebfbff]/55">Loading payslips…</p>
          ) : !recentPayslip ? (
            <p className="mt-6 text-sm text-[#ebfbff]/55">No payslips on file yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              <div>
                <p className="text-xl font-bold text-[#ebfbff]">{recentPayslip.payPeriod}</p>
                <p className="mt-1 text-sm text-[#ebfbff]/60">{recentPayslip.employeeName}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-3">
                  <p className="text-xs text-[#ebfbff]/50">Gross Pay</p>
                  <p className="mt-1 text-base font-semibold text-[#ebfbff]">
                    {formatPayslipMoney(recentPayslip.grossPay)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-3">
                  <p className="text-xs text-[#ebfbff]/50">Net Pay</p>
                  <p className="mt-1 text-base font-semibold text-[#6cc801]">
                    {formatPayslipMoney(recentPayslip.netPay)}
                  </p>
                </div>
              </div>
              <Link
                href={`/hr/payslips/${recentPayslip.id}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
              >
                View payslip detail
              </Link>
            </div>
          )}
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#ebfbff]">Your Requests</h2>
        {loading ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading payslip requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No payslip requests yet.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">
                    {request.payPeriod}
                  </h3>
                  {request.notes ? (
                    <p className="mt-2 text-sm text-[#ebfbff]/70">{request.notes}</p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${jobLetterStatusClass(request.statusLabel)}`}
                >
                  {request.statusLabel}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Requested {formatDisplayDate(request.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#ebfbff]">Payslip History</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Up to 12 months of payslip records, newest first.
          </p>
        </div>

        {archiveLoading ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading payslip history…
          </div>
        ) : historyPayslips.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No payslips on file yet.
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#ebfbff]/10 bg-[#0c151d]/50">
                  <tr>
                    {canSyncPayslips ? (
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Employee</th>
                    ) : null}
                    <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Pay Period</th>
                    <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Gross Pay</th>
                    <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Net Pay</th>
                    <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Status</th>
                    <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyPayslips.map((payslip) => (
                    <tr key={payslip.id} className="border-b border-[#ebfbff]/10 last:border-0">
                      {canSyncPayslips ? (
                        <td className="px-4 py-3 text-[#ebfbff]/80">{payslip.employeeName}</td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-[#ebfbff]">
                        {payslip.payPeriod}
                      </td>
                      <td className="px-4 py-3 text-[#ebfbff]/80">
                        {formatPayslipMoney(payslip.grossPay)}
                      </td>
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
                        <Link
                          href={`/hr/payslips/${payslip.id}`}
                          className="text-sm font-medium text-[#00c6ff] hover:text-[#6cc801]"
                        >
                          View
                        </Link>
                      </td>
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
