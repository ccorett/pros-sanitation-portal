"use client";

import type { DashboardDeliveryActivityItem } from "@/lib/dashboard-delivery-activity";
import type { DashboardSummaryMetrics } from "@/lib/dashboard-summary-service";
import { ClipboardList, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type MetricTone = "normal" | "attention" | "urgent";

type ActivityRow =
  | {
      kind: "metric";
      key: keyof DashboardSummaryMetrics;
      label: string;
      href: string;
    }
  | {
      kind: "delivery";
      key: DashboardDeliveryActivityItem["key"];
      label: string;
      href: string;
    };

const METRIC_LINKS: Array<{
  key: keyof DashboardSummaryMetrics;
  label: string;
  href: string;
}> = [
  { key: "assignedCleaningJobs", label: "Assigned Locations", href: "/jobs" },
  { key: "pendingVacationRequests", label: "Open Vacation Requests", href: "/hr/vacation" },
  {
    key: "pendingEquipmentRequests",
    label: "Pending Equipment Requests",
    href: "/equipment-supplies",
  },
  { key: "todaysBinJobs", label: "Bin Service Visits Today", href: "/jobs/bin-management/today" },
  { key: "unacknowledgedPolicies", label: "Policies Requiring Review", href: "/policies" },
  { key: "pendingPayslipRequests", label: "Payslip Requests", href: "/hr/payslips" },
  { key: "availablePayslips", label: "Available Payslips", href: "/hr/payslips" },
];

const ATTENTION_METRICS = new Set<keyof DashboardSummaryMetrics>([
  "pendingVacationRequests",
  "pendingEquipmentRequests",
  "unacknowledgedPolicies",
  "pendingPayslipRequests",
  "todaysBinJobs",
]);

const ATTENTION_DELIVERY_METRICS = new Set<DashboardDeliveryActivityItem["key"]>([
  "assignedDeliveryRequests",
  "openDeliveryRequests",
  "deliveriesAwaitingAssignment",
  "deliveriesInProgress",
]);

function metricTone(key: ActivityRow["key"], count: number): MetricTone {
  if (count === 0) {
    return "normal";
  }

  if (key === "pendingEquipmentRequests" && count >= 3) {
    return "urgent";
  }

  if (key === "deliveriesAwaitingAssignment" && count >= 3) {
    return "urgent";
  }

  if (ATTENTION_METRICS.has(key as keyof DashboardSummaryMetrics)) {
    return "attention";
  }

  if (ATTENTION_DELIVERY_METRICS.has(key as DashboardDeliveryActivityItem["key"])) {
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

function ActivityPanelContent({
  activityRows,
  metrics,
  deliveryActivity,
  loading,
  error,
  onClose,
}: {
  activityRows: ActivityRow[];
  metrics: DashboardSummaryMetrics | null;
  deliveryActivity: DashboardDeliveryActivityItem[] | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-[#ebfbff]/10 px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-base font-bold text-[#ebfbff]">My Activity</h2>
          <p className="mt-0.5 text-xs text-[#ebfbff]/50">
            Counts for your assigned work and requests.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#ebfbff]/50 transition-colors hover:bg-[#ebfbff]/10 hover:text-[#ebfbff]"
          aria-label="Close activity menu"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-4 py-3 sm:max-h-[min(70vh,32rem)] sm:px-5">
        {loading ? (
          <p className="py-4 text-sm text-[#ebfbff]/55">Loading your activity…</p>
        ) : error || !metrics ? (
          <p className="py-4 text-sm text-[#ff4d4f]">
            {error ?? "Unable to load dashboard metrics."}
          </p>
        ) : (
          <ul className="divide-y divide-[#ebfbff]/10">
            {activityRows.map((item) => {
              const count =
                item.kind === "metric"
                  ? metrics[item.key]
                  : (deliveryActivity?.find((row) => row.key === item.key)?.count ?? 0);
              const tone = metricTone(item.key, count);

              return (
                <li key={`${item.kind}-${item.key}`}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="group flex items-center gap-2 py-2 transition-colors hover:text-[#00c6ff]"
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
        )}
      </div>
    </>
  );
}

export function StaffActivityFloatingMenu() {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardSummaryMetrics | null>(null);
  const [deliveryActivity, setDeliveryActivity] = useState<
    DashboardDeliveryActivityItem[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
      const data = (await response.json()) as {
        metrics?: DashboardSummaryMetrics;
        deliveryActivity?: DashboardDeliveryActivityItem[] | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load dashboard summary.");
      }
      setMetrics(data.metrics ?? null);
      setDeliveryActivity(data.deliveryActivity ?? null);
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const activityRows: ActivityRow[] = metrics
    ? [
        ...METRIC_LINKS.map((item) => ({
          kind: "metric" as const,
          key: item.key,
          label: item.label,
          href: item.href,
        })),
        ...(deliveryActivity ?? []).map((item) => ({
          kind: "delivery" as const,
          key: item.key,
          label: item.label,
          href: "/jobs/delivery",
        })),
      ]
    : [];

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-[#0c151d]/50 backdrop-blur-[2px] sm:bg-transparent sm:backdrop-blur-0"
          aria-hidden="true"
        />
      ) : null}

      <div
        ref={containerRef}
        className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:bottom-6 sm:right-6"
      >
        {open ? (
          <div
            id={panelId}
            role="dialog"
            aria-label="My Activity"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[min(75vh,36rem)] overflow-hidden rounded-t-2xl border border-[#ebfbff]/15 bg-[#0c151d] pb-20 shadow-2xl shadow-[#0c151d]/80 sm:absolute sm:inset-x-auto sm:bottom-full sm:right-0 sm:z-auto sm:mb-3 sm:w-[min(22rem,calc(100vw-2rem))] sm:rounded-2xl sm:pb-0"
          >
            <ActivityPanelContent
              activityRows={activityRows}
              metrics={metrics}
              deliveryActivity={deliveryActivity}
              loading={loading}
              error={error}
              onClose={() => setOpen(false)}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          className="relative z-[51] flex items-center gap-2.5 rounded-full border border-[#00c6ff]/30 bg-gradient-to-r from-[#0c151d] to-[#0f2230] px-4 py-3 text-sm font-semibold text-[#ebfbff] shadow-lg shadow-[#00c6ff]/20 transition-all hover:border-[#00c6ff]/50 hover:shadow-[#00c6ff]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00c6ff]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00c6ff]/15 text-[#00c6ff]">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>My Activity</span>
        </button>
      </div>
    </>
  );
}
