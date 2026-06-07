"use client";

import type { DashboardSummaryMetrics } from "@/lib/dashboard-summary-service";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type MetricTone = "normal" | "attention" | "urgent";

const METRIC_LINKS: Array<{
  key: keyof DashboardSummaryMetrics;
  label: string;
  href: string;
}> = [
  { key: "assignedCleaningJobs", label: "Assigned Cleaning Jobs", href: "/jobs" },
  { key: "pendingVacationRequests", label: "Open Vacation Requests", href: "/hr/vacation" },
  {
    key: "pendingEquipmentRequests",
    label: "Pending Equipment Requests",
    href: "/equipment-supplies",
  },
  { key: "todaysBinJobs", label: "Today's Bin Jobs", href: "/jobs/bin-management/today" },
  { key: "unacknowledgedPolicies", label: "Policies to Acknowledge", href: "/policies" },
  { key: "pendingPayslipRequests", label: "Pending Payslip Requests", href: "/hr/payslips" },
  { key: "availablePayslips", label: "Payslips on File", href: "/hr/payslips" },
];

const ATTENTION_METRICS = new Set<keyof DashboardSummaryMetrics>([
  "pendingVacationRequests",
  "pendingEquipmentRequests",
  "unacknowledgedPolicies",
  "pendingPayslipRequests",
  "todaysBinJobs",
]);

function metricTone(
  key: keyof DashboardSummaryMetrics,
  count: number,
): MetricTone {
  if (count === 0) {
    return "normal";
  }

  if (key === "pendingEquipmentRequests" && count >= 3) {
    return "urgent";
  }

  if (ATTENTION_METRICS.has(key)) {
    return "attention";
  }

  return "normal";
}

function metricCountClass(tone: MetricTone): string {
  if (tone === "urgent") {
    return "text-[#ff4d4f]";
  }
  if (tone === "attention") {
    return "text-[#f5c542]";
  }
  return "text-[#6cc801]";
}

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
      <div className="glass-card rounded-2xl p-4 text-sm text-[#ebfbff]/55">
        Loading dashboard metrics from Neon…
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="glass-card rounded-2xl p-4 text-sm text-[#ff4d4f]">
        {error ?? "Unable to load dashboard metrics."}
      </div>
    );
  }

  return (
    <section className="glass-card rounded-2xl p-4 sm:p-5">
      <h2 className="text-base font-bold text-[#ebfbff]">Your Activity</h2>
      <p className="mt-0.5 text-xs text-[#ebfbff]/50">
        Your account counts unless you have manager or admin access.
      </p>
      <ul className="mt-3 divide-y divide-[#ebfbff]/10">
        {METRIC_LINKS.map((item) => {
          const count = metrics[item.key];
          const tone = metricTone(item.key, count);

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className="group flex items-center gap-2 py-1.5 transition-colors hover:text-[#00c6ff]"
              >
                <span className="min-w-0 shrink text-sm text-[#ebfbff]/80 group-hover:text-[#ebfbff]">
                  {item.label}
                </span>
                <span
                  className="mb-0.5 min-w-[1.5rem] flex-1 border-b border-dotted border-[#ebfbff]/15"
                  aria-hidden="true"
                />
                <span
                  className={`shrink-0 tabular-nums text-sm font-bold ${metricCountClass(tone)}`}
                >
                  {count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
