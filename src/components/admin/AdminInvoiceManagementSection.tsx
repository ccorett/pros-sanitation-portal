"use client";

import { AdminInvoiceNotificationsSection } from "@/components/admin/AdminInvoiceNotificationsSection";
import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import type {
  InvoiceAlertSummary,
  InvoiceClientRow,
  InvoiceScheduleRow,
} from "@/lib/invoice-service";
import {
  invoiceBillingCycleLabel,
  invoiceServiceTypeLabel,
  INVOICE_SERVICE_TYPE_OPTIONS,
} from "@/lib/invoice-format";
import {
  invoiceRowBorderClass,
  invoiceStatusBadgeClass,
} from "@/lib/invoice-status";
import type { InvoiceBillingCycle, InvoiceServiceType } from "@prisma/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEditTimestamp } from "@/lib/admin-format";

type InvoicePermissions = {
  canManageClients: boolean;
  canProcessSchedules: boolean;
};

const BILLING_CYCLES: Array<{ value: InvoiceBillingCycle; label: string }> = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUALLY", label: "Annually" },
];

type InvoiceViewTab = "overview" | "notifications";

type RegisterStatusFilter =
  | "all"
  | "DUE_SOON"
  | "DUE"
  | "OVERDUE"
  | "SUBMITTED"
  | "GENERATED";

const REGISTER_STATUS_FILTERS: Array<{ value: RegisterStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "DUE_SOON", label: "Due Soon" },
  { value: "DUE", label: "Due Today" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "GENERATED", label: "Generated" },
];

function invoiceTabClassName(active: boolean): string {
  return active
    ? "border-[#6cc801]/45 bg-[#6cc801]/15 text-[#6cc801]"
    : "border-[#ebfbff]/15 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:border-[#00c6ff]/30";
}

export function AdminInvoiceManagementSection() {
  const searchParams = useSearchParams();
  const activeTab: InvoiceViewTab =
    searchParams.get("tab") === "notifications" ? "notifications" : "overview";
  const [clients, setClients] = useState<InvoiceClientRow[]>([]);
  const [schedules, setSchedules] = useState<InvoiceScheduleRow[]>([]);
  const [alertSummary, setAlertSummary] = useState<InvoiceAlertSummary>({
    dueSoon: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
  });
  const [permissions, setPermissions] = useState<InvoicePermissions>({
    canManageClients: false,
    canProcessSchedules: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState({
    clientName: "",
    serviceType: "CLEANING_SERVICES" as InvoiceServiceType,
    billingCycle: "MONTHLY" as InvoiceBillingCycle,
    invoiceCountPerCycle: 1,
    usualDueDay: 1,
    remarks: "",
  });
  const [searchClient, setSearchClient] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<InvoiceServiceType | "all">(
    "all",
  );
  const [billingCycleFilter, setBillingCycleFilter] = useState<InvoiceBillingCycle | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<RegisterStatusFilter>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices");
      const data = (await response.json()) as {
        clients?: InvoiceClientRow[];
        schedules?: InvoiceScheduleRow[];
        alertSummary?: InvoiceAlertSummary;
        permissions?: InvoicePermissions;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load invoice management.");
      }
      setClients(data.clients ?? []);
      setSchedules(data.schedules ?? []);
      setAlertSummary(
        data.alertSummary ?? {
          dueSoon: 0,
          dueToday: 0,
          overdue: 0,
          upcoming: 0,
        },
      );
      setPermissions(
        data.permissions ?? {
          canManageClients: false,
          canProcessSchedules: false,
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load invoice management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateClient(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("create-client");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = (await response.json()) as { error?: string; clients?: InvoiceClientRow[] };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add client.");
      }
      setClients(data.clients ?? []);
      setShowAddClient(false);
      setClientForm({
        clientName: "",
        serviceType: "CLEANING_SERVICES",
        billingCycle: "MONTHLY",
        invoiceCountPerCycle: 1,
        usualDueDay: 1,
        remarks: "",
      });
      setMessage("Recurring client added.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add client.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateClient(clientId: string) {
    setBusyId(clientId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update client.");
      }
      setEditingClientId(null);
      setMessage("Client updated.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update client.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveClient(clientId: string, clientLabel: string) {
    if (
      !window.confirm(
        `Remove "${clientLabel}" from active invoice clients?\n\nHistory will be kept.`,
      )
    ) {
      return;
    }
    setBusyId(clientId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/clients/${clientId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove client.");
      }
      setMessage("Client removed.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove client.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleScheduleAction(
    scheduleId: string,
    action: "snooze" | "generated" | "submitted" | "remarks",
    extra?: { snoozeDays?: number; remarks?: string },
  ) {
    setBusyId(scheduleId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update schedule.");
      }
      setMessage(`Invoice schedule marked ${action}.`);
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update schedule.");
    } finally {
      setBusyId(null);
    }
  }

  function startEditClient(client: InvoiceClientRow) {
    setEditingClientId(client.id);
    setClientForm({
      clientName: client.clientName,
      serviceType: client.serviceType,
      billingCycle: client.billingCycle,
      invoiceCountPerCycle: client.invoiceCountPerCycle,
      usualDueDay: client.usualDueDay,
      remarks: client.remarks ?? "",
    });
  }

  function clientRowLabel(client: InvoiceClientRow): string {
    return `${client.clientName} · ${invoiceServiceTypeLabel(client.serviceType)} · ${invoiceBillingCycleLabel(client.billingCycle)}`;
  }

  const filteredSchedules = useMemo(() => {
    const query = searchClient.trim().toLowerCase();

    return schedules.filter((schedule) => {
      if (query && !schedule.clientName.toLowerCase().includes(query)) {
        return false;
      }
      if (serviceTypeFilter !== "all" && schedule.serviceType !== serviceTypeFilter) {
        return false;
      }
      if (billingCycleFilter !== "all" && schedule.billingCycle !== billingCycleFilter) {
        return false;
      }
      if (statusFilter !== "all" && schedule.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [schedules, searchClient, serviceTypeFilter, billingCycleFilter, statusFilter]);

  function findClientForSchedule(clientId: string): InvoiceClientRow | undefined {
    return clients.find((client) => client.id === clientId);
  }

  function startEditClientFromSchedule(schedule: InvoiceScheduleRow) {
    const client = findClientForSchedule(schedule.clientId);
    if (!client) {
      return;
    }
    startEditClient(client);
  }

  if (loading && activeTab === "overview") {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading invoice management…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/invoices"
          className={`inline-flex min-h-[40px] items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${invoiceTabClassName(activeTab === "overview")}`}
        >
          Overview
        </Link>
        <Link
          href="/admin/invoices?tab=notifications"
          className={`inline-flex min-h-[40px] items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${invoiceTabClassName(activeTab === "notifications")}`}
        >
          Invoice Notifications
        </Link>
      </div>

      {activeTab === "notifications" ? (
        <AdminInvoiceNotificationsSection embedded />
      ) : (
        <>
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

      <section className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Invoice Alerts</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-[#faad14]/30 bg-[#faad14]/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#faad14]">
              Due Soon
            </p>
            <p className="mt-2 text-3xl font-bold text-[#ebfbff]">{alertSummary.dueSoon}</p>
          </article>
          <article className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ff4d4f]">
              Due Today
            </p>
            <p className="mt-2 text-3xl font-bold text-[#ebfbff]">{alertSummary.dueToday}</p>
          </article>
          <article className="rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ff7875]">
              Overdue
            </p>
            <p className="mt-2 text-3xl font-bold text-[#ebfbff]">{alertSummary.overdue}</p>
          </article>
        </div>
      </section>

      <section className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Invoice Register</h2>
          {permissions.canManageClients ? (
            <button
              type="button"
              onClick={() => setShowAddClient((current) => !current)}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
            >
              Add Client
            </button>
          ) : null}
        </div>

        {showAddClient && permissions.canManageClients ? (
          <form
            onSubmit={handleCreateClient}
            className="grid gap-4 rounded-xl border border-[#ebfbff]/10 p-4 sm:grid-cols-2"
          >
            <label className="block sm:col-span-2">
              <span className={authLabelClassName}>Client Name</span>
              <input
                value={clientForm.clientName}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, clientName: event.target.value }))
                }
                className={authInputClassName}
                required
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Service Type</span>
              <select
                value={clientForm.serviceType}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    serviceType: event.target.value as InvoiceServiceType,
                  }))
                }
                className={authInputClassName}
              >
                {INVOICE_SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={authLabelClassName}>Billing Cycle</span>
              <select
                value={clientForm.billingCycle}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    billingCycle: event.target.value as InvoiceBillingCycle,
                  }))
                }
                className={authInputClassName}
              >
                {BILLING_CYCLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={authLabelClassName}>Invoices Per Cycle</span>
              <input
                type="number"
                min={1}
                value={clientForm.invoiceCountPerCycle}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    invoiceCountPerCycle: Number(event.target.value),
                  }))
                }
                className={authInputClassName}
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Usual Due Day</span>
              <input
                type="number"
                min={1}
                max={28}
                value={clientForm.usualDueDay}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    usualDueDay: Number(event.target.value),
                  }))
                }
                className={authInputClassName}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={authLabelClassName}>Remarks</span>
              <input
                value={clientForm.remarks}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, remarks: event.target.value }))
                }
                className={authInputClassName}
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" loading={busyId === "create-client"}>
                Save Client
              </Button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className={authLabelClassName}>Search Client</span>
            <input
              value={searchClient}
              onChange={(event) => setSearchClient(event.target.value)}
              placeholder="Client name"
              className={authInputClassName}
            />
          </label>
          <label className="block">
            <span className={authLabelClassName}>Service Type</span>
            <select
              value={serviceTypeFilter}
              onChange={(event) =>
                setServiceTypeFilter(event.target.value as InvoiceServiceType | "all")
              }
              className={authInputClassName}
            >
              <option value="all">All</option>
              {INVOICE_SERVICE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={authLabelClassName}>Billing Cycle</span>
            <select
              value={billingCycleFilter}
              onChange={(event) =>
                setBillingCycleFilter(event.target.value as InvoiceBillingCycle | "all")
              }
              className={authInputClassName}
            >
              <option value="all">All</option>
              {BILLING_CYCLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {REGISTER_STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`inline-flex min-h-[36px] items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                statusFilter === option.value
                  ? "border-[#6cc801]/45 bg-[#6cc801]/15 text-[#6cc801]"
                  : "border-[#ebfbff]/15 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:border-[#00c6ff]/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filteredSchedules.length === 0 ? (
          <p className="text-sm text-[#ebfbff]/55">No invoice register rows match these filters.</p>
        ) : (
          <>
            <DesktopTableView>
              <div className="overflow-x-auto rounded-xl border border-[#ebfbff]/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <tr>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Service Type</th>
                      <th className="px-4 py-3">Billing Cycle</th>
                      <th className="px-4 py-3">Invoices Per Cycle</th>
                      <th className="px-4 py-3">Next Due Date</th>
                      <th className="px-4 py-3">Reminder Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedules.map((schedule) => (
                      <tr
                        key={schedule.id}
                        className={`border-b border-[#ebfbff]/5 last:border-0 border-l-4 ${invoiceRowBorderClass(schedule.status)}`}
                      >
                        <td className="px-4 py-3 font-medium text-[#ebfbff]">
                          {schedule.clientName}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {invoiceServiceTypeLabel(schedule.serviceType)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {invoiceBillingCycleLabel(schedule.billingCycle)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {schedule.invoiceCountPerCycle}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{schedule.dueDate}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {schedule.reminderDate}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(schedule.status)}`}
                          >
                            {schedule.statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {schedule.remarks || "—"}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {formatEditTimestamp(schedule.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex min-w-[12rem] flex-wrap gap-2">
                            {permissions.canManageClients ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditClientFromSchedule(schedule)}
                                  className="text-xs font-semibold text-[#00c6ff]"
                                >
                                  Edit Client
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === schedule.clientId}
                                  onClick={() => {
                                    const client = findClientForSchedule(schedule.clientId);
                                    if (!client) return;
                                    void handleRemoveClient(
                                      schedule.clientId,
                                      clientRowLabel(client),
                                    );
                                  }}
                                  className="text-xs font-semibold text-[#ff4d4f]"
                                >
                                  Remove Client
                                </button>
                              </>
                            ) : null}
                            {permissions.canProcessSchedules ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busyId === schedule.id}
                                  onClick={() => {
                                    const days = window.prompt("Snooze for how many days?", "3");
                                    if (!days) return;
                                    void handleScheduleAction(schedule.id, "snooze", {
                                      snoozeDays: Number(days),
                                    });
                                  }}
                                  className="text-xs font-semibold text-[#00c6ff]"
                                >
                                  Snooze
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === schedule.id}
                                  onClick={() =>
                                    void handleScheduleAction(schedule.id, "generated")
                                  }
                                  className="text-xs font-semibold text-[#ebfbff]/80"
                                >
                                  Mark Generated
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === schedule.id}
                                  onClick={() =>
                                    void handleScheduleAction(schedule.id, "submitted")
                                  }
                                  className="text-xs font-semibold text-[#6cc801]"
                                >
                                  Mark Submitted
                                </button>
                                <button
                                  type="button"
                                  disabled={busyId === schedule.id}
                                  onClick={() => {
                                    const remarks = window.prompt(
                                      "Remarks",
                                      schedule.remarks ?? "",
                                    );
                                    if (remarks === null) return;
                                    void handleScheduleAction(schedule.id, "remarks", {
                                      remarks,
                                    });
                                  }}
                                  className="text-xs font-semibold text-[#ebfbff]/60"
                                >
                                  Edit Remarks
                                </button>
                              </>
                            ) : null}
                            <Link
                              href="/admin/invoices?tab=notifications"
                              className="text-xs font-semibold text-[#00c6ff]"
                            >
                              View Notifications
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DesktopTableView>

            <MobileCardStack>
              {filteredSchedules.map((schedule) => (
                <MobileRecordCard
                  key={schedule.id}
                  title={schedule.clientName}
                  subtitle={`${invoiceServiceTypeLabel(schedule.serviceType)} · ${invoiceBillingCycleLabel(schedule.billingCycle)}`}
                  headerExtra={
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(schedule.status)}`}
                    >
                      {schedule.statusLabel}
                    </span>
                  }
                  fields={[
                    { label: "Invoices Per Cycle", value: schedule.invoiceCountPerCycle },
                    { label: "Next Due Date", value: schedule.dueDate },
                    { label: "Reminder Date", value: schedule.reminderDate },
                    {
                      label: "Last Updated",
                      value: formatEditTimestamp(schedule.updatedAt),
                    },
                  ]}
                  detailFields={
                    schedule.remarks
                      ? [{ label: "Remarks", value: schedule.remarks }]
                      : undefined
                  }
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {permissions.canManageClients ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditClientFromSchedule(schedule)}
                            className="rounded-xl border border-[#00c6ff]/30 px-3 py-2 text-xs font-semibold text-[#00c6ff]"
                          >
                            Edit Client
                          </button>
                          <button
                            type="button"
                            disabled={busyId === schedule.clientId}
                            onClick={() => {
                              const client = findClientForSchedule(schedule.clientId);
                              if (!client) return;
                              void handleRemoveClient(schedule.clientId, client.clientName);
                            }}
                            className="rounded-xl border border-[#ff4d4f]/30 px-3 py-2 text-xs font-semibold text-[#ff4d4f]"
                          >
                            Remove Client
                          </button>
                        </>
                      ) : null}
                      {permissions.canProcessSchedules ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === schedule.id}
                            onClick={() => {
                              const days = window.prompt("Snooze for how many days?", "3");
                              if (!days) return;
                              void handleScheduleAction(schedule.id, "snooze", {
                                snoozeDays: Number(days),
                              });
                            }}
                            className="rounded-xl border border-[#00c6ff]/30 px-3 py-2 text-xs font-semibold text-[#00c6ff]"
                          >
                            Snooze
                          </button>
                          <button
                            type="button"
                            disabled={busyId === schedule.id}
                            onClick={() => void handleScheduleAction(schedule.id, "generated")}
                            className="rounded-xl border border-[#ebfbff]/20 px-3 py-2 text-xs font-semibold"
                          >
                            Mark Generated
                          </button>
                          <button
                            type="button"
                            disabled={busyId === schedule.id}
                            onClick={() => void handleScheduleAction(schedule.id, "submitted")}
                            className="rounded-xl border border-[#6cc801]/30 px-3 py-2 text-xs font-semibold text-[#6cc801]"
                          >
                            Mark Submitted
                          </button>
                          <button
                            type="button"
                            disabled={busyId === schedule.id}
                            onClick={() => {
                              const remarks = window.prompt("Remarks", schedule.remarks ?? "");
                              if (remarks === null) return;
                              void handleScheduleAction(schedule.id, "remarks", { remarks });
                            }}
                            className="rounded-xl border border-[#ebfbff]/20 px-3 py-2 text-xs font-semibold"
                          >
                            Edit Remarks
                          </button>
                        </>
                      ) : null}
                      <Link
                        href="/admin/invoices?tab=notifications"
                        className="rounded-xl border border-[#00c6ff]/30 px-3 py-2 text-xs font-semibold text-[#00c6ff]"
                      >
                        View Notifications
                      </Link>
                    </div>
                  }
                />
              ))}
            </MobileCardStack>
          </>
        )}

        {editingClientId && permissions.canManageClients ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleUpdateClient(editingClientId);
            }}
            className="grid gap-4 rounded-xl border border-[#00c6ff]/20 p-4 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-sm font-semibold text-[#00c6ff]">
              Edit Client
            </p>
            <label className="block sm:col-span-2">
              <span className={authLabelClassName}>Client Name</span>
              <input
                value={clientForm.clientName}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, clientName: event.target.value }))
                }
                className={authInputClassName}
                required
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Service Type</span>
              <select
                value={clientForm.serviceType}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    serviceType: event.target.value as InvoiceServiceType,
                  }))
                }
                className={authInputClassName}
              >
                {INVOICE_SERVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={authLabelClassName}>Billing Cycle</span>
              <select
                value={clientForm.billingCycle}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    billingCycle: event.target.value as InvoiceBillingCycle,
                  }))
                }
                className={authInputClassName}
              >
                {BILLING_CYCLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={authLabelClassName}>Invoices Per Cycle</span>
              <input
                type="number"
                min={1}
                value={clientForm.invoiceCountPerCycle}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    invoiceCountPerCycle: Number(event.target.value),
                  }))
                }
                className={authInputClassName}
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Usual Due Day</span>
              <input
                type="number"
                min={1}
                max={28}
                value={clientForm.usualDueDay}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    usualDueDay: Number(event.target.value),
                  }))
                }
                className={authInputClassName}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={authLabelClassName}>Remarks</span>
              <input
                value={clientForm.remarks}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, remarks: event.target.value }))
                }
                className={authInputClassName}
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" loading={busyId === editingClientId}>
                Save Changes
              </Button>
              <button
                type="button"
                onClick={() => setEditingClientId(null)}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#ebfbff]/20 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>
        </>
      )}
    </div>
  );
}
