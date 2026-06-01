"use client";

import { Button } from "@/components/ui/Button";
import { CounterField } from "@/components/bin-service/CounterField";
import {
  completeBinService,
  markBinCannotAccess,
  reportBinIssue,
  startBinJob,
} from "@/lib/bin-locations-storage";
import { clampBinCount, type BinWorkflowStatus } from "@/lib/bin-locations-status";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type BinLocationWorkflowProps = {
  locationId: string;
  siteName: string;
  expectedRegularBins: number;
  expectedNewBins: number;
  signatureRequired: boolean;
  initialStatus: BinWorkflowStatus;
};

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

export function BinLocationWorkflow({
  locationId,
  siteName,
  expectedRegularBins,
  expectedNewBins,
  signatureRequired,
  initialStatus,
}: BinLocationWorkflowProps) {
  const router = useRouter();
  const [started, setStarted] = useState(initialStatus === "in_progress");
  const [mode, setMode] = useState<"service" | "cannot_access" | "issue">("service");
  const maxLiners = expectedRegularBins + expectedNewBins;
  const [regularBinsServiced, setRegularBinsServiced] = useState(
    clampBinCount(expectedRegularBins, expectedRegularBins),
  );
  const [newBinsServiced, setNewBinsServiced] = useState(
    clampBinCount(expectedNewBins, expectedNewBins),
  );
  const [linersUsed, setLinersUsed] = useState(
    clampBinCount(expectedRegularBins + expectedNewBins, maxLiners),
  );
  const [clientSignatureName, setClientSignatureName] = useState("");
  const [noSignatureReason, setNoSignatureReason] = useState("");
  const [cannotAccessReason, setCannotAccessReason] = useState("");
  const [issueType, setIssueType] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totalServiced = useMemo(
    () => regularBinsServiced + newBinsServiced,
    [regularBinsServiced, newBinsServiced],
  );

  useEffect(() => {
    if (mode === "service") {
      setLinersUsed(clampBinCount(totalServiced, maxLiners));
    }
  }, [totalServiced, mode, maxLiners]);

  function ensureStarted() {
    if (!started) {
      startBinJob(locationId);
      setStarted(true);
    }
  }

  function handleStart() {
    ensureStarted();
    setMode("service");
  }

  function handleComplete() {
    ensureStarted();

    if (signatureRequired && !clientSignatureName.trim() && !noSignatureReason.trim()) {
      setError("Provide a client signature name or a no-signature reason.");
      return;
    }

    completeBinService(locationId);
    router.push("/jobs/bin-management/today");
    router.refresh();
  }

  function handleCannotAccess() {
    if (!cannotAccessReason.trim()) {
      setError("Select or enter a reason.");
      return;
    }
    markBinCannotAccess(locationId, cannotAccessReason.trim());
    router.push("/jobs/bin-management/today");
    router.refresh();
  }

  function handleReportIssue() {
    if (!issueType.trim()) {
      setError("Select an issue type.");
      return;
    }
    reportBinIssue(locationId, issueType.trim(), issueNotes.trim() || undefined);
    router.push("/jobs/bin-management/today");
    router.refresh();
  }

  if (!started && initialStatus === "idle") {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-xl font-bold text-[#ebfbff]">{siteName}</h2>
          <p className="mt-2 text-sm text-[#ebfbff]/60">
            Expected {expectedRegularBins} regular · {expectedNewBins} new bins
          </p>
        </div>
        {error ? (
          <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
            {error}
          </p>
        ) : null}
        <Button fullWidth onClick={handleStart} className="min-h-[56px] text-base">
          Start Job
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(["service", "cannot_access", "issue"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(tab)}
            className={[
              "min-h-[48px] rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm",
              mode === tab
                ? "border-[#00c6ff]/50 bg-[#00c6ff]/15 text-[#00c6ff]"
                : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
            ].join(" ")}
          >
            {tab === "service"
              ? "Service"
              : tab === "cannot_access"
                ? "Cannot Access"
                : "Report Issue"}
          </button>
        ))}
      </div>

      {mode === "service" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CounterField
              label={`Regular bins (expected ${expectedRegularBins})`}
              value={regularBinsServiced}
              onChange={(value) =>
                setRegularBinsServiced(clampBinCount(value, expectedRegularBins))
              }
              max={expectedRegularBins}
            />
            <CounterField
              label={`New bins (expected ${expectedNewBins})`}
              value={newBinsServiced}
              onChange={(value) =>
                setNewBinsServiced(clampBinCount(value, expectedNewBins))
              }
              max={expectedNewBins}
            />
          </div>
          <CounterField
            label="Liners used"
            value={linersUsed}
            onChange={(value) => setLinersUsed(clampBinCount(value, maxLiners))}
            max={maxLiners}
          />
          {signatureRequired ? (
            <div className="glass-card space-y-4 rounded-2xl p-5">
              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">Client signature name</span>
                <input
                  value={clientSignatureName}
                  onChange={(event) => setClientSignatureName(event.target.value)}
                  className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff]"
                />
              </label>
              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">No signature reason</span>
                <input
                  value={noSignatureReason}
                  onChange={(event) => setNoSignatureReason(event.target.value)}
                  className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff]"
                />
              </label>
            </div>
          ) : null}
          <Button fullWidth onClick={handleComplete} className="min-h-[56px] text-base">
            Complete Service
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
                  "min-h-[52px] rounded-xl border px-4 py-3 text-left text-sm font-semibold",
                  cannotAccessReason === reason
                    ? "border-[#ff8c42]/50 bg-[#ff8c42]/15 text-[#ff8c42]"
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
            onClick={handleCannotAccess}
            className="min-h-[56px] text-base"
          >
            Cannot Access
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
                  "min-h-[52px] rounded-xl border px-4 py-3 text-left text-sm font-semibold",
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
            onClick={handleReportIssue}
            className="min-h-[56px] text-base"
          >
            Report Issue
          </Button>
        </>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
