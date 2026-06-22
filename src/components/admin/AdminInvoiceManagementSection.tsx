"use client";

import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { authInputClassName, authLabelClassName } from "@/lib/auth-form-styles";
import type {
  InvoiceAlertRecipientRow,
  InvoiceAlertSummary,
  InvoiceClientRow,
  InvoiceScheduleRow,
} from "@/lib/invoice-service";
import type { InvoiceEmailConfigStatus } from "@/lib/invoice-email-config";
import { INVOICE_EMAIL_CONFIG_WARNING } from "@/lib/invoice-email-config";
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
import { useCallback, useEffect, useState } from "react";

type InvoicePermissions = {
  canManageClients: boolean;
  canManageRecipients: boolean;
  canProcessSchedules: boolean;
  canSendStatusEmail: boolean;
};

const BILLING_CYCLES: Array<{ value: InvoiceBillingCycle; label: string }> = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ANNUALLY", label: "Annually" },
];

export function AdminInvoiceManagementSection() {
  const [clients, setClients] = useState<InvoiceClientRow[]>([]);
  const [schedules, setSchedules] = useState<InvoiceScheduleRow[]>([]);
  const [recipients, setRecipients] = useState<InvoiceAlertRecipientRow[]>([]);
  const [alertSummary, setAlertSummary] = useState<InvoiceAlertSummary>({
    dueSoon: 0,
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
  });
  const [emailConfig, setEmailConfig] = useState<InvoiceEmailConfigStatus>({
    configured: true,
    missing: [],
  });
  const [permissions, setPermissions] = useState<InvoicePermissions>({
    canManageClients: false,
    canManageRecipients: false,
    canProcessSchedules: false,
    canSendStatusEmail: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sendingStatusEmail, setSendingStatusEmail] = useState(false);
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
  const [recipientForm, setRecipientForm] = useState({
    name: "",
    email: "",
    roleLabel: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices");
      const data = (await response.json()) as {
        clients?: InvoiceClientRow[];
        schedules?: InvoiceScheduleRow[];
        recipients?: InvoiceAlertRecipientRow[];
        alertSummary?: InvoiceAlertSummary;
        emailConfig?: InvoiceEmailConfigStatus;
        permissions?: InvoicePermissions;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load invoice management.");
      }
      setClients(data.clients ?? []);
      setSchedules(data.schedules ?? []);
      setRecipients(data.recipients ?? []);
      setAlertSummary(
        data.alertSummary ?? {
          dueSoon: 0,
          dueToday: 0,
          overdue: 0,
          upcoming: 0,
        },
      );
      setEmailConfig(
        data.emailConfig ?? {
          configured: true,
          missing: [],
        },
      );
      setPermissions(
        data.permissions ?? {
          canManageClients: false,
          canManageRecipients: false,
          canProcessSchedules: false,
          canSendStatusEmail: false,
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

  async function handleSendStatusEmail() {
    setSendingStatusEmail(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices/send-status", {
        method: "POST",
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError("Status email failed. Check email configuration.");
        return;
      }
      setMessage("Status email sent successfully.");
    } catch {
      setError("Status email failed. Check email configuration.");
    } finally {
      setSendingStatusEmail(false);
    }
  }

  async function handleAddRecipient(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("add-recipient");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/invoices/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipientForm),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to add recipient.");
      }
      setRecipientForm({ name: "", email: "", roleLabel: "" });
      setMessage("Alert recipient added.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add recipient.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveRecipient(recipientId: string) {
    setBusyId(recipientId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/recipients/${recipientId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove recipient.");
      }
      setMessage("Alert recipient removed.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove recipient.");
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

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading invoice management…
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      {!emailConfig.configured ? (
        <p className="rounded-xl border border-[#faad14]/40 bg-[#faad14]/10 px-4 py-3 text-sm text-[#faad14]">
          {INVOICE_EMAIL_CONFIG_WARNING}
          {emailConfig.missing.length > 0
            ? ` Missing: ${emailConfig.missing.join(", ")}.`
            : null}
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

      {permissions.canManageRecipients ? (
        <section className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#ebfbff]">Alert Recipients</h2>
          <p className="text-sm text-[#ebfbff]/55">
            Grouped invoice reminders are sent to admins, super admins, admin assistants,
            and these additional recipients.
          </p>
          <form
            onSubmit={handleAddRecipient}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="block">
              <span className={authLabelClassName}>Name</span>
              <input
                value={recipientForm.name}
                onChange={(event) =>
                  setRecipientForm((current) => ({ ...current, name: event.target.value }))
                }
                className={authInputClassName}
                required
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Email</span>
              <input
                type="email"
                value={recipientForm.email}
                onChange={(event) =>
                  setRecipientForm((current) => ({ ...current, email: event.target.value }))
                }
                className={authInputClassName}
                required
              />
            </label>
            <label className="block">
              <span className={authLabelClassName}>Role / Label</span>
              <input
                value={recipientForm.roleLabel}
                onChange={(event) =>
                  setRecipientForm((current) => ({
                    ...current,
                    roleLabel: event.target.value,
                  }))
                }
                className={authInputClassName}
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" loading={busyId === "add-recipient"} fullWidth>
                Add Recipient
              </Button>
            </div>
          </form>
          {recipients.length > 0 ? (
            <ul className="space-y-2 text-sm text-[#ebfbff]/75">
              {recipients.map((recipient) => (
                <li
                  key={recipient.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ebfbff]/10 px-4 py-3"
                >
                  <span>
                    {recipient.name} · {recipient.email}
                    {recipient.roleLabel ? ` · ${recipient.roleLabel}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === recipient.id}
                    onClick={() => void handleRemoveRecipient(recipient.id)}
                    className="text-xs font-semibold text-[#ff4d4f]"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#ebfbff]/45">No manual alert recipients yet.</p>
          )}
        </section>
      ) : null}

      <section className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Recurring Clients</h2>
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

        {clients.length === 0 ? (
          <p className="text-sm text-[#ebfbff]/55">No recurring clients yet.</p>
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
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                      {permissions.canManageClients ? (
                        <th className="px-4 py-3">Action</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b border-[#ebfbff]/5 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-[#ebfbff]">
                          {client.clientName}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {invoiceServiceTypeLabel(client.serviceType)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {invoiceBillingCycleLabel(client.billingCycle)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {client.invoiceCountPerCycle}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {client.nextDueDate ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{client.status}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {client.remarks || "—"}
                        </td>
                        {permissions.canManageClients ? (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditClient(client)}
                                className="text-xs font-semibold text-[#00c6ff]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busyId === client.id}
                                onClick={() =>
                                  void handleRemoveClient(client.id, clientRowLabel(client))
                                }
                                className="text-xs font-semibold text-[#ff4d4f]"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DesktopTableView>
            <MobileCardStack>
              {clients.map((client) => (
                <MobileRecordCard
                  key={client.id}
                  title={client.clientName}
                  subtitle={invoiceServiceTypeLabel(client.serviceType)}
                  fields={[
                    {
                      label: "Billing Cycle",
                      value: invoiceBillingCycleLabel(client.billingCycle),
                    },
                    { label: "Invoices Per Cycle", value: client.invoiceCountPerCycle },
                    { label: "Next Due Date", value: client.nextDueDate ?? "—" },
                    { label: "Status", value: client.status },
                  ]}
                  detailFields={
                    client.remarks
                      ? [{ label: "Remarks", value: client.remarks }]
                      : undefined
                  }
                  actions={
                    permissions.canManageClients ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditClient(client)}
                          className="rounded-xl border border-[#00c6ff]/30 px-3 py-2 text-xs font-semibold text-[#00c6ff]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busyId === client.id}
                          onClick={() =>
                            void handleRemoveClient(client.id, client.clientName)
                          }
                          className="rounded-xl border border-[#ff4d4f]/30 px-3 py-2 text-xs font-semibold text-[#ff4d4f]"
                        >
                          Remove
                        </button>
                      </div>
                    ) : undefined
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

      <section className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Invoice Schedule</h2>
          {permissions.canSendStatusEmail ? (
            <Button
              type="button"
              disabled={sendingStatusEmail}
              onClick={() => void handleSendStatusEmail()}
            >
              {sendingStatusEmail ? "Sending..." : "Send Status"}
            </Button>
          ) : null}
        </div>
        {schedules.length === 0 ? (
          <p className="text-sm text-[#ebfbff]/55">No invoice schedules yet.</p>
        ) : (
          <>
            <DesktopTableView>
              <div className="overflow-x-auto rounded-xl border border-[#ebfbff]/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <tr>
                      <th className="px-4 py-3">Client Name</th>
                      <th className="px-4 py-3">Service Type</th>
                      <th className="px-4 py-3">Cycle</th>
                      <th className="px-4 py-3">Invoices</th>
                      <th className="px-4 py-3">Reminder</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Remarks</th>
                      {permissions.canProcessSchedules ? (
                        <th className="px-4 py-3">Action</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((schedule) => (
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
                          {schedule.cycleLabel}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {schedule.invoiceCountPerCycle}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {schedule.reminderDate}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{schedule.dueDate}</td>
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
                        {permissions.canProcessSchedules ? (
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
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
                                Generated
                              </button>
                              <button
                                type="button"
                                disabled={busyId === schedule.id}
                                onClick={() =>
                                  void handleScheduleAction(schedule.id, "submitted")
                                }
                                className="text-xs font-semibold text-[#6cc801]"
                              >
                                Submitted
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
                                Remarks
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DesktopTableView>
            <MobileCardStack>
              {schedules.map((schedule) => (
                <MobileRecordCard
                  key={schedule.id}
                  title={schedule.clientName}
                  subtitle={`${invoiceServiceTypeLabel(schedule.serviceType)} · ${schedule.cycleLabel}`}
                  headerExtra={
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${invoiceStatusBadgeClass(schedule.status)}`}
                    >
                      {schedule.statusLabel}
                    </span>
                  }
                  fields={[
                    { label: "Invoices", value: schedule.invoiceCountPerCycle },
                    { label: "Reminder", value: schedule.reminderDate },
                    { label: "Due", value: schedule.dueDate },
                  ]}
                  detailFields={
                    schedule.remarks
                      ? [{ label: "Remarks", value: schedule.remarks }]
                      : undefined
                  }
                  actions={
                    permissions.canProcessSchedules ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === schedule.id}
                          onClick={() =>
                            void handleScheduleAction(schedule.id, "generated")
                          }
                          className="rounded-xl border border-[#ebfbff]/20 px-3 py-2 text-xs font-semibold"
                        >
                          Generated
                        </button>
                        <button
                          type="button"
                          disabled={busyId === schedule.id}
                          onClick={() =>
                            void handleScheduleAction(schedule.id, "submitted")
                          }
                          className="rounded-xl border border-[#6cc801]/30 px-3 py-2 text-xs font-semibold text-[#6cc801]"
                        >
                          Submitted
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </MobileCardStack>
          </>
        )}
      </section>
    </div>
  );
}
