import { mockPayslips, formatDisplayDate } from "@/lib/hr-mock-data";
import { Download, FileText } from "lucide-react";
import Link from "next/link";

export function PayslipsSection() {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <p className="text-sm text-[#ebfbff]/55">
        View-only payslip archive. Mock PDFs for preview — no payroll calculations.
      </p>
      {mockPayslips.map((payslip) => (
        <article key={payslip.id} className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#ebfbff]">{payslip.periodLabel}</h2>
              <p className="mt-1 text-sm text-[#ebfbff]/60">
                Pay date: {formatDisplayDate(payslip.payDate)}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/api/hr/payslips/${payslip.id}?download=0`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
            >
              Open PDF
            </Link>
            <a
              href={`/api/hr/payslips/${payslip.id}?download=1`}
              download={payslip.fileName}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download PDF
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
