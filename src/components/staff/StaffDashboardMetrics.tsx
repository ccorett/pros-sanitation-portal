"use client";

import type { DashboardSummaryMetrics } from "@/lib/dashboard-summary-service";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const METRIC_LINKS: Array<{
  key: keyof DashboardSummaryMetrics;
  label: string;
  href: string;
}> = [
  { key: "assignedCleaningJobs", label: "Assigned cleaning jobs", href: "/jobs" },
  { key: "pendingVacationRequests", label: "Open vacation requests", href: "/hr/vacation" },
  {
    key: "pendingEquipmentRequests",
    label: "Pending equipment requests",
    href: "/equipment-supplies",
  },
  { key: "todaysBinJobs", label: "Today's bin jobs", href: "/jobs/bin-management/today" },
  { key: "unacknowledgedPolicies", label: "Policies to acknowledge", href: "/policies" },
  { key: "pendingPayslipRequests", label: "Pending payslip requests", href: "/hr/payslips" },
  { key: "availablePayslips", label: "Payslips on file", href: "/hr/payslips" },
];

export function StaffDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
      const data = (await response.json()) as {
        metrics?: DashboardSummaryMetrics;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load dashboard summary.");
      }
      setMetrics(data.metrics ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load dashboard summary.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
        Loading dashboard metrics from Neon…
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-[#ff4d4f]">
        {error ?? "Unable to load dashboard metrics."}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8">
      <h2 className="text-lg font-bold text-[#ebfbff]">Your activity</h2>
      <p className="mt-1 text-sm text-[#ebfbff]/55">
        Live counts from Neon — no cached mock data.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {METRIC_LINKS.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3 transition-colors hover:border-[#00c6ff]/30"
            >
              <span className="text-sm text-[#ebfbff]/80">{item.label}</span>
              <span className="text-lg font-bold text-[#6cc801]">{metrics[item.key]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
