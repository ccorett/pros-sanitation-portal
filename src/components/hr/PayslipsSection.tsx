"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate, jobLetterStatusClass } from "@/lib/hr-mock-data";
import {
  formatPayslipMoney,
  type PayslipArchiveDto,
} from "@/lib/payslip-archive-service";
import type { PayslipRequestDto } from "@/lib/payslip-request-service";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PayslipsSectionProps = {
  viewerEmployeeId: string;
  canManagePayslips?: boolean;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#ebfbff]/10 py-2.5">
      <span className="text-sm text-[#ebfbff]/60">{label}</span>
      <span className="text-sm font-semibold text-[#ebfbff]">{value}</span>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#00c6ff]">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-[#ebfbff]/80">{value}</p>
    </div>
  );
}

function RecentPayslipCard({ payslip }: { payslip: PayslipArchiveDto }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xl font-bold text-[#ebfbff]">{payslip.payPeriod}</p>
        <p className="mt-1 text-sm text-[#ebfbff]/60">{payslip.employeeName}</p>
      </div>

      <div>
        <DetailRow label="Employee Name" value={payslip.employeeName} />
        <DetailRow label="Pay Period" value={payslip.payPeriod} />
        <DetailRow label="Gross Pay" value={formatPayslipMoney(payslip.grossPay)} />
        <DetailRow
          label="Health Surcharge"
          value={formatPayslipMoney(payslip.healthSurcharge)}
        />
        <DetailRow label="NIS" value={formatPayslipMoney(payslip.nis)} />
        <DetailRow label="PAYE" value={formatPayslipMoney(payslip.paye)} />
        <DetailRow
          label="Company Deductions"
          value={formatPayslipMoney(payslip.companyDeductions)}
        />
        <DetailRow label="Net Pay" value={formatPayslipMoney(payslip.netPay)} />
      </div>

      <DetailBlock label="Gross Pay Breakdown" value={payslip.grossPayDetails} />
      <DetailBlock label="Deduction Breakdown" value={payslip.companyDeductionDetails} />

      <Link
        href={`/hr/payslips/${payslip.id}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
      >
        View full payslip detail
      </Link>
    </div>
  );
}

export function PayslipsSection({
  viewerEmployeeId,
  canManagePayslips = false,
}: PayslipsSectionProps) {
  const [requests, setRequests] = useState<PayslipRequestDto[]>([]);
  const [payslips, setPayslips] = useState<PayslipArchiveDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const ownPayslips = payslips.filter((payslip) => payslip.employeeId === viewerEmployeeId);
  const historyPayslips = canManagePayslips ? payslips : ownPayslips;
  const recentPayslip = ownPayslips[0] ?? null;

  return (
    <div className="space-y-8">
      {canManagePayslips ? (
        <div className="glass-card rounded-2xl border border-[#00c6ff]/20 p-4 sm:p-5">
          <p className="text-sm text-[#ebfbff]/70">
            Managers and admins can upload monthly payroll CSV files from{" "}
            <Link
              href="/hr/payslip-administration/import"
              className="font-semibold text-[#00c6ff] hover:text-[#6cc801]"
            >
              Payslip Administration → Import Payslips
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
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
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#ebfbff]">Recent Payslip</h2>
            <p className="mt-1 text-sm text-[#ebfbff]/55">
              Your most recent pay period on file.
            </p>

            {archiveLoading ? (
              <p className="mt-6 text-sm text-[#ebfbff]/55">Loading payslips…</p>
            ) : !recentPayslip ? (
              <p className="mt-6 text-sm text-[#ebfbff]/55">No payslips on file yet.</p>
            ) : (
              <div className="mt-6">
                <RecentPayslipCard payslip={recentPayslip} />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#ebfbff]">Payslip History</h2>
              <p className="mt-1 text-sm text-[#ebfbff]/55">
                Last 12 months, newest first.
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
                        {canManagePayslips ? (
                          <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                            Employee
                          </th>
                        ) : null}
                        <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                          Pay Period
                        </th>
                        <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                          Gross Pay
                        </th>
                        <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                          Net Pay
                        </th>
                        <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                          Status
                        </th>
                        <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyPayslips.map((payslip) => (
                        <tr
                          key={payslip.id}
                          className="border-b border-[#ebfbff]/10 last:border-0"
                        >
                          {canManagePayslips ? (
                            <td className="px-4 py-3 text-[#ebfbff]/80">
                              {payslip.employeeName}
                            </td>
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
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
