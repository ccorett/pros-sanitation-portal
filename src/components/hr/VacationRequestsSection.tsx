"use client";

import { Button } from "@/components/ui/Button";
import {
  addVacationRequest,
  getVacationRequests,
} from "@/lib/hr-client-storage";
import {
  formatDisplayDate,
  vacationStatusClass,
  type VacationRequest,
} from "@/lib/hr-mock-data";
import { useState } from "react";

type VacationRequestsSectionProps = {
  employeeRecordId: string;
};

export function VacationRequestsSection({
  employeeRecordId,
}: VacationRequestsSectionProps) {
  const [requests, setRequests] = useState<VacationRequest[]>(() =>
    getVacationRequests(employeeRecordId),
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!startDate || !endDate || !reason.trim()) {
      setError("Start date, end date, and reason are required.");
      return;
    }

    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    const updated = addVacationRequest(employeeRecordId, {
      startDate,
      endDate,
      reason: reason.trim(),
    });

    setRequests(updated);
    setStartDate("");
    setEndDate("");
    setReason("");
    setSuccess("Vacation request submitted. Status: Pending.");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
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

        <Button type="submit" fullWidth className="min-h-[56px] text-base">
          Submit Vacation Request
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#ebfbff]">Your Requests</h2>
        {requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No vacation requests yet.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#00c6ff]">
                    {formatDisplayDate(request.startDate)} –{" "}
                    {formatDisplayDate(request.endDate)}
                  </p>
                  <p className="mt-2 text-sm text-[#ebfbff]/70">{request.reason}</p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${vacationStatusClass(request.status)}`}
                >
                  {request.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Submitted {formatDisplayDate(request.submittedAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
