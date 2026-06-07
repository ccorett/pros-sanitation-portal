"use client";

import {
  formatPayslipMoney,
  type PayslipArchiveDto,
} from "@/lib/payslip-archive-service";
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
      <DetailBlock
        label="Company Deduction Details"
        value={payslip.companyDeductionDetails}
      />

      <Link
        href={`/hr/payslips/${payslip.id}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
      >
        View full payslip detail
      </Link>
    </div>
  );
}

function PayslipHistoryTable({
  payslips,
  canManagePayslips,
  scrollable = false,
}: {
  payslips: PayslipArchiveDto[];
  canManagePayslips: boolean;
  scrollable?: boolean;
}) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div
        className={
          scrollable
            ? "max-h-[320px] overflow-x-auto overflow-y-auto sm:max-h-[500px] lg:max-h-[560px]"
            : "overflow-x-auto"
        }
      >
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]">
            <tr>
              {canManagePayslips ? (
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
            {payslips.map((payslip) => (
              <tr
                key={payslip.id}
                className="border-b border-[#ebfbff]/10 last:border-0"
              >
                {canManagePayslips ? (
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
  );
}

export function PayslipsSection({
  viewerEmployeeId,
  canManagePayslips = false,
}: PayslipsSectionProps) {
  const [payslips, setPayslips] = useState<PayslipArchiveDto[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

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
    void loadArchive();
  }, [loadArchive]);

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
            <PayslipHistoryTable
              payslips={historyPayslips}
              canManagePayslips={canManagePayslips}
              scrollable={canManagePayslips}
            />
          )}
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
