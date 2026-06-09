"use client";

import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import type { EquipmentRequestDto } from "@/lib/equipment-request-service";
import { readInboxFocusParams } from "@/lib/inbox-focus";
import { formatEditTimestamp } from "@/lib/admin-format";
import { useCallback, useEffect, useState } from "react";

function urgencyClass(urgency: string): string {
  if (urgency === "URGENT" || urgency === "Urgent") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (urgency === "HIGH" || urgency === "High") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  return "border-[#00c6ff]/30 bg-[#00c6ff]/10 text-[#00c6ff]";
}

function statusClass(status: string): string {
  if (status === "APPROVED" || status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "REJECTED" || status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (status === "FULFILLED" || status === "Fulfilled") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  if (status === "CANCELLED" || status === "Cancelled") {
    return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/50";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function EquipmentRequestsApprovalSection() {
  const [requests, setRequests] = useState<EquipmentRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<EquipmentRequestDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/equipment-requests");
      const data = (await response.json()) as {
        requests?: EquipmentRequestDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load equipment requests.");
      }

      setRequests(data.requests ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load equipment requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const { equipmentRequestId } = readInboxFocusParams();
    if (!equipmentRequestId || requests.length === 0) return;
    const match = requests.find((row) => row.id === equipmentRequestId);
    if (match) {
      setSelected(match);
    }
  }, [requests]);

  async function updateStatus(
    requestId: string,
    status: "APPROVED" | "REJECTED" | "FULFILLED" | "CANCELLED",
  ) {
    setBusyId(requestId);
    setMessage(null);
    setActionError(null);

    try {
      const response = await fetch(`/api/equipment-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as {
        request?: EquipmentRequestDto;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update request.");
      }

      if (data.request) {
        setRequests((current) =>
          current.map((row) => (row.id === data.request!.id ? data.request! : row)),
        );
      } else {
        await loadRequests();
      }

      setMessage(`Request marked ${status.toLowerCase()}.`);
      if (selected?.id === requestId) {
        setSelected(data.request ?? null);
      }
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update request.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderRequestActions(request: EquipmentRequestDto) {
    return (
      <>
        <button
          type="button"
          onClick={() => setSelected(request)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
        >
          View Details
        </button>
        <button
          type="button"
          disabled={request.status !== "PENDING" || busyId === request.id}
          onClick={() => void updateStatus(request.id, "APPROVED")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={request.status !== "PENDING" || busyId === request.id}
          onClick={() => void updateStatus(request.id, "REJECTED")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={request.status !== "APPROVED" || busyId === request.id}
          onClick={() => void updateStatus(request.id, "FULFILLED")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
        >
          Mark Fulfilled
        </button>
      </>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#ebfbff]">Equipment & Supplies Requests</h2>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Review supply requests submitted from Equipment & Supplies.
        </p>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {actionError ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {actionError}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading equipment requests…
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No equipment requests yet.
        </div>
      ) : (
        <>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll w-full rounded-2xl">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <th className="px-4 py-4 font-semibold sm:px-6">Request Type</th>
                    <th className="px-4 py-4 font-semibold">Item Name</th>
                    <th className="px-4 py-4 font-semibold">Requested By</th>
                    <th className="px-4 py-4 font-semibold">Quantity</th>
                    <th className="px-4 py-4 font-semibold">Urgency</th>
                    <th className="px-4 py-4 font-semibold">Reason</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Date Submitted</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                    >
                      <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                        Supply Request
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">{request.itemName}</td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        <span className="block font-medium text-[#ebfbff]">
                          {request.requestedByName}
                        </span>
                        <span className="text-xs text-[#ebfbff]/45">
                          {request.requestedByEmail}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.quantityRequested} {request.unit}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(request.urgency)}`}
                        >
                          {request.urgencyLabel}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-4 py-4 text-[#ebfbff]/70">
                        {request.reason}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}
                        >
                          {request.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {formatEditTimestamp(request.createdAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap gap-2">
                          {renderRequestActions(request)}
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
              <MobileRecordCard
                key={request.id}
                title={request.itemName}
                subtitle={request.requestedByName}
                headerExtra={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}
                  >
                    {request.statusLabel}
                  </span>
                }
                fields={[
                  {
                    label: "Quantity",
                    value: `${request.quantityRequested} ${request.unit}`,
                  },
                  {
                    label: "Urgency",
                    value: (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(request.urgency)}`}
                      >
                        {request.urgencyLabel}
                      </span>
                    ),
                  },
                  {
                    label: "Date Submitted",
                    value: formatEditTimestamp(request.createdAt),
                  },
                ]}
                detailFields={[
                  { label: "Request Type", value: "Supply Request" },
                  { label: "Requester Email", value: request.requestedByEmail },
                  { label: "Reason", value: request.reason },
                ]}
                actions={renderRequestActions(request)}
              />
            ))}
          </MobileCardStack>
        </>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">Supply Request · {selected.itemName}</h3>
            <div className="space-y-2 text-sm text-[#ebfbff]/70">
              <p>
                <span className="text-[#ebfbff]/45">Requested by:</span>{" "}
                {selected.requestedByName} ({selected.requestedByEmail})
              </p>
              <p>
                <span className="text-[#ebfbff]/45">Quantity:</span>{" "}
                {selected.quantityRequested} {selected.unit}
              </p>
              <p>
                <span className="text-[#ebfbff]/45">Urgency:</span> {selected.urgencyLabel}
              </p>
              <p>
                <span className="text-[#ebfbff]/45">Status:</span> {selected.statusLabel}
              </p>
              <p>
                <span className="text-[#ebfbff]/45">Reason:</span> {selected.reason}
              </p>
              {selected.reviewedByName ? (
                <p>
                  <span className="text-[#ebfbff]/45">Reviewed by:</span>{" "}
                  {selected.reviewedByName}
                  {selected.reviewedAt
                    ? ` · ${formatEditTimestamp(selected.reviewedAt)}`
                    : ""}
                </p>
              ) : null}
              {selected.decisionNotes ? (
                <p>
                  <span className="text-[#ebfbff]/45">Notes:</span> {selected.decisionNotes}
                </p>
              ) : null}
            </div>
            <Button type="button" fullWidth onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
