"use client";

import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import { inboxRecordElementId, readInboxFocusParams } from "@/lib/inbox-focus";
import type { VacationRequestDto } from "@/lib/vacation-request-service";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { VacationFinalStatus } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";

export function ManagerApprovalsSection() {
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
            request.finalStatus === VacationFinalStatus.PENDING_MANAGER_REVIEW,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const { requestId } = readInboxFocusParams();
    if (!requestId || requests.length === 0) return;
    const row = document.getElementById(inboxRecordElementId("vacation", requestId));
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [requests]);

  async function handleDecision(
    requestId: string,
    action: "APPROVED" | "REJECTED",
  ) {
    setMessage(null);
    setActingId(requestId);

    try {
      const response = await fetch(
        `/api/hr/vacation-requests/${requestId}/manager`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update vacation request.");
      }

      setMessage(`Request ${action === "APPROVED" ? "approved" : "rejected"}.`);
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
        <p className="rounded-xl border border-[#00c6ff]/30 bg-[#00c6ff]/10 px-4 py-3 text-sm text-[#00c6ff]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#ebfbff]/60">Loading vacation requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-[#ebfbff]/60">
          No requests are waiting for manager approval. After a supervisor
          recommends approval or rejection, requests appear here.
        </p>
      ) : (
        <>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll w-full rounded-2xl border border-[#ebfbff]/10">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#0c151d]/80 text-xs uppercase tracking-wide text-[#ebfbff]/45">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Supervisor Status</th>
                    <th className="px-4 py-3">Supervisor Notes</th>
                    <th className="px-4 py-3">Final Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      id={inboxRecordElementId("vacation", request.id)}
                      className="border-t border-[#ebfbff]/10 text-[#ebfbff]/80"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[#ebfbff]">
                          {request.employeeName}
                        </p>
                        <p className="text-xs text-[#ebfbff]/50">
                          {request.employeeEmail}
                        </p>
                      </td>
                      <td className="px-4 py-4">{request.locationAssignment}</td>
                      <td className="px-4 py-4">
                        {formatDisplayDate(request.startDate)}
                      </td>
                      <td className="px-4 py-4">
                        {formatDisplayDate(request.endDate)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-[#00c6ff]">
                          {request.supervisorStatusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-[#ebfbff]/50">
                        {request.supervisorNotes ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${workflowStatusClass(request.finalStatusLabel)}`}
                        >
                          {request.finalStatusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="login"
                            disabled={actingId === request.id}
                            onClick={() => void handleDecision(request.id, "APPROVED")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actingId === request.id}
                            onClick={() => void handleDecision(request.id, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DesktopTableView>

          <MobileCardStack>
            {requests.map((request) => (
              <div
                key={request.id}
                id={inboxRecordElementId("vacation", request.id)}
              >
                <MobileRecordCard
                  title={request.employeeName}
                  subtitle={request.employeeEmail}
                  fields={[
                    { label: "Location", value: request.locationAssignment },
                    {
                      label: "Start Date",
                      value: formatDisplayDate(request.startDate),
                    },
                    {
                      label: "End Date",
                      value: formatDisplayDate(request.endDate),
                    },
                    {
                      label: "Supervisor Status",
                      value: (
                        <span className="font-semibold text-[#00c6ff]">
                          {request.supervisorStatusLabel}
                        </span>
                      ),
                    },
                    {
                      label: "Final Status",
                      value: (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${workflowStatusClass(request.finalStatusLabel)}`}
                        >
                          {request.finalStatusLabel}
                        </span>
                      ),
                    },
                  ]}
                  detailFields={[
                    {
                      label: "Supervisor Notes",
                      value: request.supervisorNotes ?? "—",
                    },
                  ]}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="login"
                        fullWidth
                        disabled={actingId === request.id}
                        onClick={() => void handleDecision(request.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        disabled={actingId === request.id}
                        onClick={() => void handleDecision(request.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                    </>
                  }
                />
              </div>
            ))}
          </MobileCardStack>
        </>
      )}
    </div>
  );
}
