"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { VacationRequestDto } from "@/lib/vacation-request-service";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { VacationFinalStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

export function SupervisorVacationReviewSection() {
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<VacationRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hr/vacation-requests");
      if (!response.ok) {
        throw new Error("Unable to load vacation requests.");
      }
      const data = (await response.json()) as { requests: VacationRequestDto[] };
      setRequests(
        data.requests.filter(
          (request) =>
            request.finalStatus === VacationFinalStatus.PENDING_SUPERVISOR_REVIEW,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function handleAwareness(
    requestId: string,
    action: "AWARE" | "UNAWARE",
  ) {
    setMessage(null);
    setActingId(requestId);

    try {
      const response = await fetch(
        `/api/hr/vacation-requests/${requestId}/supervisor`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            supervisorNotes: notesById[requestId]?.trim() ?? "",
          }),
        },
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update vacation request.");
      }

      setMessage(
        `Marked ${action === "AWARE" ? "Aware" : "Unaware"}. Request sent to manager for final approval.`,
      );
      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update vacation request.",
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/60">
          Loading vacation requests…
        </p>
      ) : requests.length === 0 ? (
        <p className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/60">
          No vacation requests are waiting for your Aware/Unaware review.
        </p>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Employee</th>
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold">Start Date</th>
                <th className="px-4 py-4 font-semibold">End Date</th>
                <th className="px-4 py-4 font-semibold">Reason</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-[#ebfbff]/5 align-top last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 sm:px-6">
                    <p className="font-medium text-[#ebfbff]">{request.employeeName}</p>
                    <p className="text-xs text-[#ebfbff]/50">{request.employeeEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {request.locationAssignment}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatDisplayDate(request.startDate)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatDisplayDate(request.endDate)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{request.reason}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workflowStatusClass(request.finalStatusLabel)}`}
                    >
                      {request.finalStatusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <label className="mb-3 block">
                      <span className="text-xs text-[#ebfbff]/50">Supervisor Notes</span>
                      <textarea
                        value={notesById[request.id] ?? ""}
                        onChange={(event) =>
                          setNotesById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        rows={2}
                        placeholder="Optional"
                        className="mt-1 w-full min-w-[200px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="login"
                        disabled={actingId === request.id}
                        onClick={() => void handleAwareness(request.id, "AWARE")}
                      >
                        Aware
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={actingId === request.id}
                        onClick={() => void handleAwareness(request.id, "UNAWARE")}
                      >
                        Unaware
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
