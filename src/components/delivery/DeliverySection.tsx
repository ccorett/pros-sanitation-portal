"use client";

import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import type { DeliveryRequestDto } from "@/lib/delivery-request-service";
import type { DeliveryRequestStatus } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

type DeliveryPayload = {
  requests: DeliveryRequestDto[];
  drivers?: { id: string; name: string; email: string }[];
  role: {
    isManager: boolean;
    isCoordinator: boolean;
    isDriver: boolean;
  };
};

type DeliveryTab = "requests" | "list";

const ACTIVE_STATUSES: DeliveryRequestStatus[] = [
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
];

function statusClass(status: DeliveryRequestStatus): string {
  if (status === "FULFILLED") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "CANCELLED" || status === "CANNOT_FULFIL") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (status === "IN_TRANSIT") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  if (status === "ASSIGNED") {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/75";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-TT", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DeliverySection() {
  const [payload, setPayload] = useState<DeliveryPayload | null>(null);
  const [tab, setTab] = useState<DeliveryTab>("requests");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<DeliveryRequestDto | null>(null);
  const [noteTarget, setNoteTarget] = useState<DeliveryRequestDto | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [noteText, setNoteText] = useState("");
  const [createItems, setCreateItems] = useState([{ itemName: "", quantity: 1 }]);
  const [createForm, setCreateForm] = useState({
    requestedByName: "",
    requestedByEmail: "",
    requestingLocation: "",
    responsibleSupervisorName: "",
    priority: "NORMAL",
    notes: "",
  });

  const canCreate =
    payload?.role.isManager || payload?.role.isCoordinator || false;
  const canCoordinate =
    payload?.role.isManager || payload?.role.isCoordinator || false;
  const isDriverOnly =
    payload?.role.isDriver && !payload?.role.isManager && !payload?.role.isCoordinator;

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/delivery-requests?includeDrivers=1");
      const data = (await response.json()) as DeliveryPayload & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load delivery requests.");
      }
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load delivery requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const visibleRequests = useMemo(() => {
    const requests = payload?.requests ?? [];
    if (tab === "requests") {
      return requests.filter((request) => ACTIVE_STATUSES.includes(request.status));
    }
    return requests;
  }, [payload?.requests, tab]);

  function renderDeliveryActions(request: DeliveryRequestDto) {
    return (
      <>
        {canCoordinate && request.status === "PENDING" ? (
          <ActionButton
            label="Assign"
            onClick={() => {
              setAssignTarget(request);
              setSelectedDriverId(payload?.drivers?.[0]?.id ?? "");
            }}
            disabled={busyId === request.id}
          />
        ) : null}
        {canCoordinate &&
        request.status !== "FULFILLED" &&
        request.status !== "CANCELLED" ? (
          <ActionButton
            label="Fulfilled"
            tone="success"
            onClick={() =>
              patchRequest(request.id, {
                action: "updateStatus",
                status: "FULFILLED",
              })
            }
            disabled={busyId === request.id}
          />
        ) : null}
        {canCoordinate &&
        request.status !== "FULFILLED" &&
        request.status !== "CANCELLED" ? (
          <ActionButton
            label="Close"
            tone="danger"
            onClick={() =>
              patchRequest(request.id, {
                action: "close",
                notes: "Closed by coordinator",
              })
            }
            disabled={busyId === request.id}
          />
        ) : null}
        {isDriverOnly && request.status === "ASSIGNED" ? (
          <ActionButton
            label="In Transit"
            onClick={() =>
              patchRequest(request.id, {
                action: "updateStatus",
                status: "IN_TRANSIT",
              })
            }
            disabled={busyId === request.id}
          />
        ) : null}
        {isDriverOnly &&
        (request.status === "ASSIGNED" || request.status === "IN_TRANSIT") ? (
          <>
            <ActionButton
              label="Fulfilled"
              tone="success"
              onClick={() =>
                patchRequest(request.id, {
                  action: "updateStatus",
                  status: "FULFILLED",
                })
              }
              disabled={busyId === request.id}
            />
            <ActionButton
              label="Cannot Fulfil"
              tone="danger"
              onClick={() =>
                patchRequest(request.id, {
                  action: "updateStatus",
                  status: "CANNOT_FULFIL",
                })
              }
              disabled={busyId === request.id}
            />
          </>
        ) : null}
        <ActionButton
          label="Add Note"
          onClick={() => {
            setNoteTarget(request);
            setNoteText("");
          }}
          disabled={busyId === request.id}
        />
      </>
    );
  }

  async function patchRequest(
    requestId: string,
    body: Record<string, unknown>,
  ) {
    setBusyId(requestId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/delivery-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Update failed.");
      }
      setMessage("Delivery request updated.");
      setAssignTarget(null);
      setNoteTarget(null);
      setNoteText("");
      await loadRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function createRequest() {
    setBusyId("create");
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/delivery-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          items: createItems,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create delivery request.");
      }
      setMessage("Delivery request created.");
      setShowCreate(false);
      setCreateItems([{ itemName: "", quantity: 1 }]);
      setCreateForm({
        requestedByName: "",
        requestedByEmail: "",
        requestingLocation: "",
        responsibleSupervisorName: "",
        priority: "NORMAL",
        notes: "",
      });
      await loadRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create delivery request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/jobs"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
        >
          ← Work Locations
        </Link>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
          >
            New Delivery Request
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          Delivery Requests
        </TabButton>
        <TabButton active={tab === "list"} onClick={() => setTab("list")}>
          Delivery List
        </TabButton>
      </div>

      {isDriverOnly ? (
        <p className="text-sm text-[#ebfbff]/60">
          Assigned deliveries only. Mark in transit, fulfilled, or cannot fulfil as needed.
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading delivery requests…
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No delivery requests in this view.
        </div>
      ) : (
        <>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll rounded-2xl">
              <table className="min-w-[1500px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <th className="px-4 py-4 font-semibold sm:px-6">Request ID</th>
                    <th className="px-4 py-4 font-semibold">Item(s)</th>
                    <th className="px-4 py-4 font-semibold">Requested By</th>
                    <th className="px-4 py-4 font-semibold">Requesting Location</th>
                    <th className="px-4 py-4 font-semibold">Responsible Supervisor</th>
                    <th className="px-4 py-4 font-semibold">Requested Date</th>
                    <th className="px-4 py-4 font-semibold">Priority</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Driver</th>
                    <th className="px-4 py-4 font-semibold">Notes</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                    >
                      <td className="px-4 py-4 font-medium text-[#00c6ff] sm:px-6">
                        {request.requestNumber}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.itemsSummary}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.requestedByName}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.requestingLocation}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.responsibleSupervisorName ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {formatDate(request.requestedDate)}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.priorityLabel}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}
                        >
                          {request.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {request.assignedDriverName ?? "—"}
                      </td>
                      <td className="max-w-[220px] px-4 py-4 text-[#ebfbff]/70">
                        <span className="line-clamp-2">{request.notes ?? "—"}</span>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap gap-2">
                          {renderDeliveryActions(request)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DesktopTableView>

          <MobileCardStack>
            {visibleRequests.map((request) => (
              <MobileRecordCard
                key={request.id}
                title={request.itemsSummary}
                subtitle={request.requestingLocation}
                headerExtra={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(request.status)}`}
                  >
                    {request.statusLabel}
                  </span>
                }
                fields={[
                  { label: "Requested By", value: request.requestedByName },
                  { label: "Supervisor", value: request.responsibleSupervisorName ?? "—" },
                  { label: "Requested Date", value: formatDate(request.requestedDate) },
                  { label: "Priority", value: request.priorityLabel },
                  { label: "Driver", value: request.assignedDriverName ?? "—" },
                ]}
                detailFields={[
                  { label: "Request ID", value: request.requestNumber },
                  { label: "Notes", value: request.notes ?? "—" },
                ]}
                actions={renderDeliveryActions(request)}
              />
            ))}
          </MobileCardStack>
        </>
      )}

      {showCreate ? (
        <Modal title="New Delivery Request" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            {createItems.map((item, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="block">
                  <span className="text-sm text-[#ebfbff]/70">Item</span>
                  <input
                    value={item.itemName}
                    onChange={(event) => {
                      const next = [...createItems];
                      next[index] = { ...next[index], itemName: event.target.value };
                      setCreateItems(next);
                    }}
                    className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-[#ebfbff]/70">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => {
                      const next = [...createItems];
                      next[index] = {
                        ...next[index],
                        quantity: Number(event.target.value),
                      };
                      setCreateItems(next);
                    }}
                    className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setCreateItems((current) => [...current, { itemName: "", quantity: 1 }])
              }
              className="text-sm font-semibold text-[#00c6ff]"
            >
              + Add item
            </button>
            <FormField
              label="Requested By"
              value={createForm.requestedByName}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, requestedByName: value }))
              }
            />
            <FormField
              label="Requester Email"
              value={createForm.requestedByEmail}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, requestedByEmail: value }))
              }
            />
            <FormField
              label="Requesting Location"
              value={createForm.requestingLocation}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  requestingLocation: value,
                }))
              }
            />
            <FormField
              label="Responsible Supervisor"
              value={createForm.responsibleSupervisorName}
              onChange={(value) =>
                setCreateForm((current) => ({
                  ...current,
                  responsibleSupervisorName: value,
                }))
              }
            />
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Priority</span>
              <select
                value={createForm.priority}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>
            <FormField
              label="Notes"
              value={createForm.notes}
              onChange={(value) =>
                setCreateForm((current) => ({ ...current, notes: value }))
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createRequest()}
                disabled={busyId === "create"}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
              >
                Create Request
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {assignTarget ? (
        <Modal
          title={`Assign Driver · ${assignTarget.requestNumber}`}
          onClose={() => setAssignTarget(null)}
        >
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Driver</span>
            <select
              value={selectedDriverId}
              onChange={(event) => setSelectedDriverId(event.target.value)}
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
            >
              {(payload?.drivers ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} ({driver.email})
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAssignTarget(null)}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                patchRequest(assignTarget.id, {
                  action: "assignDriver",
                  assignedDriverId: selectedDriverId,
                })
              }
              disabled={!selectedDriverId || busyId === assignTarget.id}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
            >
              Assign
            </button>
          </div>
        </Modal>
      ) : null}

      {noteTarget ? (
        <Modal
          title={`Add Note · ${noteTarget.requestNumber}`}
          onClose={() => setNoteTarget(null)}
        >
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Note</span>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNoteTarget(null)}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                patchRequest(noteTarget.id, {
                  action: "addNote",
                  notes: noteText,
                })
              }
              disabled={!noteText.trim() || busyId === noteTarget.id}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] disabled:opacity-40"
            >
              Save Note
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center rounded-xl border px-4 py-2 text-sm font-semibold ${
        active
          ? "border-[#00c6ff]/40 bg-[#00c6ff]/10 text-[#ebfbff]"
          : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/65"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "danger";
}) {
  const classes =
    tone === "success"
      ? "border-[#6cc801]/40 bg-[#6cc801]/10"
      : tone === "danger"
        ? "border-[#ff4d4f]/40 bg-[#ff4d4f]/10"
        : "border-[#00c6ff]/40 bg-[#00c6ff]/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[40px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40 ${classes}`}
    >
      {label}
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#ebfbff]">{title}</h3>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="sr-only"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[#ebfbff]/70">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
      />
    </label>
  );
}
