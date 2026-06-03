"use client";

import { Button } from "@/components/ui/Button";
import { CounterField } from "@/components/bin-service/CounterField";
import {
  computeDaysSinceLastService,
  formatBinDate,
} from "@/lib/bin-locations-status";
import {
  fetchBinJobsToday,
  type BinFieldTodayJob,
} from "@/lib/bin-service/field-client";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const CANNOT_ACCESS_REASONS = [
  "Site locked / no access",
  "Contact not available",
  "Safety concern",
  "Other",
];

const ISSUE_TYPES = [
  "Missing bins",
  "Damaged bins",
  "Access problem",
  "Other",
];

function sortByPriority(jobs: BinFieldTodayJob[]) {
  return [...jobs].sort((a, b) => {
    const rank = (color: string) => (color === "red" ? 0 : color === "yellow" ? 1 : 2);
    const diff = rank(a.rotation.color) - rank(b.rotation.color);
    if (diff !== 0) return diff;
    const daysA = a.lastServiceDate
      ? computeDaysSinceLastService(a.lastServiceDate)
      : 999;
    const daysB = b.lastServiceDate
      ? computeDaysSinceLastService(b.lastServiceDate)
      : 999;
    return daysB - daysA;
  });
}

export function BinTodaysJobsTable() {
  const router = useRouter();
  const [jobs, setJobs] = useState<BinFieldTodayJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [mode, setMode] = useState<"complete" | "cannot_access" | "issue">("complete");
  const [regularServiced, setRegularServiced] = useState(0);
  const [newServiced, setNewServiced] = useState(0);
  const [linersUsed, setLinersUsed] = useState(0);
  const [serviceNotes, setServiceNotes] = useState("");
  const [cannotAccessReason, setCannotAccessReason] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBinJobsToday();
      setJobs(sortByPriority(rows));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load today's jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeJob = useMemo(
    () => jobs.find((job) => job.id === activeJobId),
    [jobs, activeJobId],
  );

  function openComplete(job: BinFieldTodayJob) {
    setActiveJobId(job.id);
    setMode("complete");
    setRegularServiced(job.setup.expectedRegularBins);
    setNewServiced(job.setup.expectedNewBins);
    setLinersUsed(job.setup.expectedRegularBins + job.setup.expectedNewBins);
    setServiceNotes(job.displayNotes);
    void fetch(`/api/bin-service/jobs/${job.id}/start`, { method: "POST" });
  }

  function openCannotAccess(job: BinFieldTodayJob) {
    setActiveJobId(job.id);
    setMode("cannot_access");
    setCannotAccessReason("");
    void fetch(`/api/bin-service/jobs/${job.id}/start`, { method: "POST" });
  }

  function openIssue(job: BinFieldTodayJob) {
    setActiveJobId(job.id);
    setMode("issue");
    setIssueType("");
    setIssueNotes("");
    void fetch(`/api/bin-service/jobs/${job.id}/start`, { method: "POST" });
  }

  async function handleComplete() {
    if (!activeJobId) return;
    setSaving(true);
    const response = await fetch(`/api/bin-service/jobs/${activeJobId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        regularBinsServiced: regularServiced,
        newBinsServiced: newServiced,
        linersUsed,
        serviceNotes,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to complete service.");
      return;
    }
    setActiveJobId(null);
    setMessage("Service completed. Last and next service dates updated in Neon.");
    await refresh();
    router.refresh();
  }

  async function handleCannotAccess() {
    if (!activeJobId || !cannotAccessReason.trim()) return;
    setSaving(true);
    const response = await fetch(
      `/api/bin-service/jobs/${activeJobId}/cannot-access`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cannotAccessReason.trim(),
          serviceNotes,
        }),
      },
    );
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to save cannot access.");
      return;
    }
    setActiveJobId(null);
    setMessage("Cannot access recorded.");
    await refresh();
    router.refresh();
  }

  async function handleReportIssue() {
    if (!activeJobId || !issueType.trim()) return;
    setSaving(true);
    const response = await fetch(
      `/api/bin-service/jobs/${activeJobId}/report-issue`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType, issueNotes, serviceNotes }),
      },
    );
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Unable to report issue.");
      return;
    }
    setActiveJobId(null);
    setMessage("Issue reported.");
    await refresh();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading due and overdue bin jobs…
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ff4d4f]">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        No due or overdue bin locations right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      <div className="glass-card portal-table-scroll rounded-2xl">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
              <th className="px-4 py-4 font-semibold">New Bins</th>
              <th className="px-4 py-4 font-semibold">Regular Bins</th>
              <th className="px-4 py-4 font-semibold">Total Bins</th>
              <th className="px-4 py-4 font-semibold">Last Service Date</th>
              <th className="px-4 py-4 font-semibold">Days Since Last Service</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold">Notes</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const styles = getRotationStatusStyles(job.rotation.color);
              const daysSince = job.lastServiceDate
                ? computeDaysSinceLastService(job.lastServiceDate)
                : "—";

              return (
                <tr
                  key={job.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                    {job.siteName}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {job.setup.expectedNewBins}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {job.setup.expectedRegularBins}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {job.setup.expectedNewBins + job.setup.expectedRegularBins}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {job.lastServiceDate ? formatBinDate(job.lastServiceDate) : "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{daysSince}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
                    >
                      {job.rotation.label}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                    {job.displayNotes || "—"}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex min-w-[320px] flex-wrap gap-2">
                      <Link
                        href={`/jobs/bin-management/job/${job.id}`}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Start Job
                      </Link>
                      <button
                        type="button"
                        onClick={() => openComplete(job)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Complete Service
                      </button>
                      <button
                        type="button"
                        onClick={() => openCannotAccess(job)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#f5c542]/40 bg-[#f5c542]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Cannot Access
                      </button>
                      <button
                        type="button"
                        onClick={() => openIssue(job)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Report Issue
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void refresh()}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh list
      </button>

      {activeJob ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">{activeJob.siteName}</h3>

            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Service notes</span>
              <textarea
                value={serviceNotes}
                onChange={(event) => setServiceNotes(event.target.value)}
                rows={2}
                className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff]"
              />
            </label>

            {mode === "complete" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CounterField
                    label={`Regular bins (expected ${activeJob.setup.expectedRegularBins})`}
                    value={regularServiced}
                    onChange={setRegularServiced}
                  />
                  <CounterField
                    label={`New bins (expected ${activeJob.setup.expectedNewBins})`}
                    value={newServiced}
                    onChange={setNewServiced}
                  />
                </div>
                <CounterField
                  label="Liners used"
                  value={linersUsed}
                  onChange={setLinersUsed}
                />
                <Button
                  fullWidth
                  className="min-h-[52px]"
                  loading={saving}
                  onClick={() => void handleComplete()}
                >
                  Confirm Complete Service
                </Button>
              </>
            ) : null}

            {mode === "cannot_access" ? (
              <>
                <div className="grid gap-2">
                  {CANNOT_ACCESS_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCannotAccessReason(reason)}
                      className={[
                        "min-h-[48px] rounded-xl border px-4 py-2 text-left text-sm font-semibold",
                        cannotAccessReason === reason
                          ? "border-[#f5c542]/50 bg-[#f5c542]/15 text-[#f5c542]"
                          : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
                      ].join(" ")}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <Button
                  fullWidth
                  variant="secondary"
                  className="min-h-[52px]"
                  loading={saving}
                  onClick={() => void handleCannotAccess()}
                >
                  Save Cannot Access
                </Button>
              </>
            ) : null}

            {mode === "issue" ? (
              <>
                <div className="grid gap-2">
                  {ISSUE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIssueType(type)}
                      className={[
                        "min-h-[48px] rounded-xl border px-4 py-2 text-left text-sm font-semibold",
                        issueType === type
                          ? "border-[#ff4d4f]/50 bg-[#ff4d4f]/15 text-[#ff4d4f]"
                          : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <textarea
                  value={issueNotes}
                  onChange={(event) => setIssueNotes(event.target.value)}
                  rows={3}
                  placeholder="Additional notes (optional)"
                  className="w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff]"
                />
                <Button
                  fullWidth
                  variant="secondary"
                  className="min-h-[52px]"
                  loading={saving}
                  onClick={() => void handleReportIssue()}
                >
                  Save Issue Report
                </Button>
              </>
            ) : null}

            <Button
              fullWidth
              variant="ghost"
              onClick={() => setActiveJobId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
