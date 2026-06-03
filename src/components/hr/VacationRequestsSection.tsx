"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { VacationRequestDto } from "@/lib/vacation-request-service";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { useCallback, useEffect, useState } from "react";

type VacationRequestsSectionProps = {
  locationAssignment: string;
};

function supervisorStatusClass(status: string): string {
  if (status === "Aware") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Unaware") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

function managerStatusClass(status: string): string {
  if (status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function VacationRequestsSection({
  locationAssignment,
}: VacationRequestsSectionProps) {
  const [requests, setRequests] = useState<VacationRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hr/vacation-requests");
      if (!response.ok) {
        throw new Error("Unable to load vacation requests.");
      }
      const data = (await response.json()) as { requests: VacationRequestDto[] };
      setRequests(data.requests);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load vacation requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!locationAssignment) {
      setError(
        "Location assignment is required before submitting vacation requests.",
      );
      return;
    }

    if (!startDate || !endDate || !reason.trim()) {
      setError("Start date, end date, and reason are required.");
      return;
    }

    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/hr/vacation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit vacation request.");
      }

      setStartDate("");
      setEndDate("");
      setReason("");
      setSuccess(
        "Vacation request submitted. Status: Pending Supervisor Review.",
      );
      await loadRequests();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit vacation request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Submit Vacation Request</h2>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Start Date</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-2 w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">End Date</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-2 w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Reason</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            placeholder="Brief reason for your request"
            required
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
            {success}
          </p>
        ) : null}

        <Button
          type="submit"
          fullWidth
          className="min-h-[56px] text-base"
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit Vacation Request"}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#ebfbff]">Your Requests</h2>
        {loading ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading vacation requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No vacation requests yet.
          </div>
        ) : (
          <div className="glass-card overflow-x-auto rounded-2xl">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-4 py-4 font-semibold sm:px-6">Start Date</th>
                  <th className="px-4 py-4 font-semibold">End Date</th>
                  <th className="px-4 py-4 font-semibold">Reason</th>
                  <th className="px-4 py-4 font-semibold">Supervisor Status</th>
                  <th className="px-4 py-4 font-semibold">Manager Status</th>
                  <th className="px-4 py-4 font-semibold">Final Status</th>
                  <th className="px-4 py-4 font-semibold sm:px-6">Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 text-[#ebfbff]/80 sm:px-6">
                      {formatDisplayDate(request.startDate)}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/80">
                      {formatDisplayDate(request.endDate)}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{request.reason}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${supervisorStatusClass(request.supervisorStatusLabel)}`}
                      >
                        {request.supervisorStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${managerStatusClass(request.managerStatusLabel)}`}
                      >
                        {request.managerStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workflowStatusClass(request.finalStatusLabel)}`}
                      >
                        {request.finalStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70 sm:px-6">
                      {formatDisplayDate(request.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
