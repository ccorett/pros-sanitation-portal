import {
  formatPayslipMoney,
  type PayslipArchiveDto,
} from "@/lib/payslip-archive-service";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type PayslipDetailSectionProps = {
  payslip: PayslipArchiveDto;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#ebfbff]/10 py-3">
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
    <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 p-4">
      <h3 className="text-sm font-semibold text-[#00c6ff]">{label}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-[#ebfbff]/80">{value}</p>
    </div>
  );
}

export function PayslipDetailSection({ payslip }: PayslipDetailSectionProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/hr/payslips"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#00c6ff] transition-colors hover:text-[#6cc801]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Payslips
      </Link>

      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#00c6ff]">Payslip Detail</p>
            <h1 className="mt-1 text-2xl font-bold text-[#ebfbff]">{payslip.payPeriod}</h1>
            <p className="mt-2 text-sm text-[#ebfbff]/60">{payslip.employeeName}</p>
          </div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              payslip.archived
                ? "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/70"
                : "border-[#6cc801]/30 bg-[#6cc801]/10 text-[#6cc801]"
            }`}
          >
            {payslip.statusLabel}
          </span>
        </div>

        <div className="mt-6">
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

        <div className="mt-6 space-y-4">
          <DetailBlock label="Gross Pay Breakdown" value={payslip.grossPayDetails} />
          <DetailBlock label="Deduction Breakdown" value={payslip.companyDeductionDetails} />
        </div>

        {payslip.importedAt ? (
          <p className="mt-6 text-xs text-[#ebfbff]/45">
            Imported {formatDisplayDate(payslip.importedAt)}
          </p>
        ) : payslip.uploadedAt ? (
          <p className="mt-6 text-xs text-[#ebfbff]/45">
            Uploaded {formatDisplayDate(payslip.uploadedAt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
