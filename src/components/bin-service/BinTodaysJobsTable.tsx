"use client";

import { Button } from "@/components/ui/Button";
import { CounterField } from "@/components/bin-service/CounterField";
import {
  clampBinCount,
  computeDaysSinceLastService,
  formatBinDate,
  getBinServiceStatus,
  statusColorClass,
} from "@/lib/bin-locations-status";
import {
  completeBinService,
  getDueAndOverdueLocations,
  markBinCannotAccess,
  reportBinIssue,
  startBinJob,
  type BinLocationView,
} from "@/lib/bin-locations-storage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

function sortByPriority(locations: BinLocationView[]) {
  return [...locations].sort((a, b) => {
    const statusA = getBinServiceStatus(a);
    const statusB = getBinServiceStatus(b);
    const rank = (color: string) => (color === "red" ? 0 : 1);
    const diff = rank(statusA.color) - rank(statusB.color);
    if (diff !== 0) return diff;
    return (
      computeDaysSinceLastService(b.lastServiceDate) -
      computeDaysSinceLastService(a.lastServiceDate)
    );
  });
}

export function BinTodaysJobsTable() {
  const router = useRouter();
  const [locations, setLocations] = useState<BinLocationView[]>(() =>
    sortByPriority(getDueAndOverdueLocations()),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"complete" | "cannot_access" | "issue">("complete");
  const [regularServiced, setRegularServiced] = useState(0);
  const [newServiced, setNewServiced] = useState(0);
  const [cannotAccessReason, setCannotAccessReason] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const activeLocation = useMemo(
    () => locations.find((location) => location.id === activeId),
    [locations, activeId],
  );

  function refresh() {
    setLocations(sortByPriority(getDueAndOverdueLocations()));
  }

  function openComplete(location: BinLocationView) {
    setActiveId(location.id);
    setMode("complete");
    setRegularServiced(
      clampBinCount(
        location.regularBinsServiced ?? location.regularBins,
        location.regularBins,
      ),
    );
    setNewServiced(
      clampBinCount(location.newBinsServiced ?? location.newBins, location.newBins),
    );
    startBinJob(location.id);
    refresh();
  }

  function openCannotAccess(location: BinLocationView) {
    setActiveId(location.id);
    setMode("cannot_access");
    setCannotAccessReason("");
    startBinJob(location.id);
    refresh();
  }

  function openIssue(location: BinLocationView) {
    setActiveId(location.id);
    setMode("issue");
    setIssueType("");
    setIssueNotes("");
    startBinJob(location.id);
    refresh();
  }

  function handleComplete() {
    if (!activeId) return;
    completeBinService(activeId);
    setActiveId(null);
    setMessage("Service completed. Last service date updated.");
    refresh();
  }

  function handleCannotAccess() {
    if (!activeId || !cannotAccessReason.trim()) return;
    markBinCannotAccess(activeId, cannotAccessReason.trim());
    setActiveId(null);
    setMessage("Cannot access recorded.");
    refresh();
  }

  function handleReportIssue() {
    if (!activeId || !issueType.trim()) return;
    reportBinIssue(activeId, issueType.trim(), issueNotes.trim() || undefined);
    setActiveId(null);
    setMessage("Issue reported.");
    refresh();
  }

  if (locations.length === 0) {
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

      <div className="glass-card overflow-x-auto rounded-2xl">
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
            {locations.map((location) => {
              const status = getBinServiceStatus(location);
              const daysSince = computeDaysSinceLastService(location.lastServiceDate);

              return (
                <tr
                  key={location.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                    {location.location}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{location.newBins}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{location.regularBins}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.newBins + location.regularBins}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatBinDate(location.lastServiceDate)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{daysSince}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorClass(status.color)}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                    {location.displayNotes || "—"}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex min-w-[320px] flex-wrap gap-2">
                      <Link
                        href={`/jobs/bin-management/job/${location.id}`}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Start Job
                      </Link>
                      <button
                        type="button"
                        onClick={() => openComplete(location)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Complete Service
                      </button>
                      <button
                        type="button"
                        onClick={() => openCannotAccess(location)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#f5c542]/40 bg-[#f5c542]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Cannot Access
                      </button>
                      <button
                        type="button"
                        onClick={() => openIssue(location)}
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

      {activeLocation ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">{activeLocation.location}</h3>

            {mode === "complete" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <CounterField
                    label={`Regular bins (expected ${activeLocation.regularBins})`}
                    value={regularServiced}
                    onChange={(value) =>
                      setRegularServiced(
                        clampBinCount(value, activeLocation.regularBins),
                      )
                    }
                    max={activeLocation.regularBins}
                  />
                  <CounterField
                    label={`New bins (expected ${activeLocation.newBins})`}
                    value={newServiced}
                    onChange={(value) =>
                      setNewServiced(clampBinCount(value, activeLocation.newBins))
                    }
                    max={activeLocation.newBins}
                  />
                </div>
                <Button fullWidth className="min-h-[52px]" onClick={handleComplete}>
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
                  onClick={handleCannotAccess}
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
                  onClick={handleReportIssue}
                >
                  Save Issue Report
                </Button>
              </>
            ) : null}

            <Button
              fullWidth
              variant="ghost"
              onClick={() => {
                setActiveId(null);
                router.refresh();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
