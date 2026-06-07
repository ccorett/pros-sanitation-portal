"use client";

import { Button } from "@/components/ui/Button";
import { formatPayslipMoney } from "@/lib/payslip-archive-service";
import type {
  PayslipRecoveryEmployeeOption,
  SkippedPayslipDto,
} from "@/lib/payslip-recovery-service";
import { useCallback, useEffect, useState } from "react";

export function PayslipRecoverySection() {
  const [skipped, setSkipped] = useState<SkippedPayslipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [searchByPayslip, setSearchByPayslip] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<
    Record<string, PayslipRecoveryEmployeeOption[]>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSkipped = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-import/skipped");
      if (!response.ok) {
        throw new Error("Unable to load skipped payslips.");
      }
      const data = (await response.json()) as { skipped: SkippedPayslipDto[] };
      setSkipped(data.skipped);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load skipped payslips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkipped();
  }, [loadSkipped]);

  async function handleAutoRecover() {
    setRecovering(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/hr/payslip-import/recover", { method: "POST" });
      const data = (await response.json()) as {
        error?: string;
        result?: {
          recovered: number;
          remaining: number;
          normalizedPayPeriods: number;
        };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to recover skipped payslips.");
      }

      setMessage(
        `Recovery complete: ${data.result?.recovered ?? 0} linked, ${data.result?.remaining ?? 0} remaining, ${data.result?.normalizedPayPeriods ?? 0} pay periods normalized.`,
      );
      await loadSkipped();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to recover skipped payslips.");
    } finally {
      setRecovering(false);
    }
  }

  async function handleSearch(payslipId: string) {
    const query = searchByPayslip[payslipId]?.trim() ?? "";
    if (!query) {
      return;
    }

    try {
      const response = await fetch(
        `/api/hr/payslip-import/employees?q=${encodeURIComponent(query)}`,
      );
      if (!response.ok) {
        throw new Error("Unable to search employees.");
      }
      const data = (await response.json()) as {
        employees: PayslipRecoveryEmployeeOption[];
      };
      setSearchResults((current) => ({ ...current, [payslipId]: data.employees }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to search employees.");
    }
  }

  async function handleAssign(payslipId: string, employeeId: string) {
    setAssigningId(payslipId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/hr/payslip-import/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payslipId, employeeId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to assign skipped payslip.");
      }

      setMessage("Skipped payslip assigned to employee.");
      await loadSkipped();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to assign skipped payslip.");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#ebfbff]">Skipped Payslip Recovery</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Review unmatched import rows, auto-match by name, or manually assign an employee.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[48px]"
          disabled={recovering}
          onClick={() => void handleAutoRecover()}
        >
          {recovering ? "Recovering…" : "Auto-Recover Matches"}
        </Button>
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

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading skipped payslips…
        </div>
      ) : skipped.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No skipped payslip records waiting for recovery.
        </div>
      ) : (
        <div className="space-y-4">
          {skipped.map((payslip) => (
            <article key={payslip.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">{payslip.employeeName}</h3>
                  <p className="mt-1 text-sm text-[#ebfbff]/55">
                    {payslip.employeeEmail || "No email on record"}
                  </p>
                  <p className="mt-2 text-sm text-[#ebfbff]/70">
                    {payslip.payPeriod} · Gross {formatPayslipMoney(payslip.grossPay)} · Net{" "}
                    {formatPayslipMoney(payslip.netPay)}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-3 py-1 text-xs font-semibold text-[#ff9f0a]">
                  Skipped
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  type="text"
                  value={searchByPayslip[payslip.id] ?? payslip.employeeName}
                  onChange={(event) =>
                    setSearchByPayslip((current) => ({
                      ...current,
                      [payslip.id]: event.target.value,
                    }))
                  }
                  placeholder="Search employee name or email"
                  className="min-h-[44px] flex-1 rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px]"
                  onClick={() => void handleSearch(payslip.id)}
                >
                  Search
                </Button>
              </div>

              {searchResults[payslip.id]?.length ? (
                <ul className="mt-4 space-y-2">
                  {searchResults[payslip.id].map((employee) => (
                    <li
                      key={employee.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-[#ebfbff]">{employee.fullName}</p>
                        <p className="text-xs text-[#ebfbff]/55">{employee.companyEmail}</p>
                      </div>
                      <Button
                        type="button"
                        className="min-h-[40px] px-4 text-sm"
                        disabled={assigningId === payslip.id}
                        onClick={() => void handleAssign(payslip.id, employee.id)}
                      >
                        {assigningId === payslip.id ? "Assigning…" : "Assign"}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
