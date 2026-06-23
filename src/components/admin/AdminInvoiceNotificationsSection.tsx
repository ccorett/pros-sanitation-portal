"use client";

import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import {
  INVOICE_NOTIFICATION_FILTERS,
  invoiceNotificationStatusBadgeClass,
  invoiceNotificationTypeBadgeClass,
} from "@/lib/invoice-notification-format";
import type { InvoiceNotificationRow } from "@/lib/invoice-notification-service";
import { formatEditTimestamp } from "@/lib/admin-format";
import { useCallback, useEffect, useState } from "react";

export function AdminInvoiceNotificationsSection({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const [notifications, setNotifications] = useState<InvoiceNotificationRow[]>([]);
  const [filter, setFilter] = useState<(typeof INVOICE_NOTIFICATION_FILTERS)[number]["value"]>(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/invoices/notifications?filter=${encodeURIComponent(filter)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        notifications?: InvoiceNotificationRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load invoice notifications.");
      }
      setNotifications(data.notifications ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load invoice notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleStatusChange(
    notificationId: string,
    action: "read" | "unread",
  ) {
    setBusyId(notificationId);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/invoices/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update notification.");
      }
      setMessage(action === "read" ? "Notification marked read." : "Notification marked unread.");
      await loadNotifications();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update notification.",
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div
        className={
          embedded
            ? "rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55"
            : "glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55"
        }
      >
        Loading invoice notifications…
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Invoice Notifications</h2>
          <button
            type="button"
            onClick={() => void loadNotifications()}
            className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
          >
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {INVOICE_NOTIFICATION_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`inline-flex min-h-[36px] items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === option.value
                  ? "border-[#6cc801]/45 bg-[#6cc801]/15 text-[#6cc801]"
                  : "border-[#ebfbff]/15 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:border-[#00c6ff]/30"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-[#ebfbff]/55">No notifications match this filter.</p>
        ) : (
          <>
            <DesktopTableView>
              <div className="overflow-x-auto rounded-xl border border-[#ebfbff]/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Notification Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => (
                      <tr
                        key={notification.id}
                        className="border-b border-[#ebfbff]/5 last:border-b-0"
                      >
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {formatEditTimestamp(notification.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#ebfbff]">
                          {notification.clientName}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">
                          {notification.cycleLabel}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${invoiceNotificationTypeBadgeClass(notification.type)}`}
                          >
                            {notification.typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${invoiceNotificationStatusBadgeClass(notification.status)}`}
                          >
                            {notification.statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">{notification.message}</td>
                        <td className="px-4 py-3">
                          {notification.status === "UNREAD" ? (
                            <Button
                              type="button"
                              loading={busyId === notification.id}
                              onClick={() => void handleStatusChange(notification.id, "read")}
                            >
                              Mark Read
                            </Button>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === notification.id}
                              onClick={() => void handleStatusChange(notification.id, "unread")}
                              className="inline-flex min-h-[44px] items-center rounded-xl border border-[#ebfbff]/20 px-4 py-2 text-sm font-semibold text-[#ebfbff] disabled:opacity-50"
                            >
                              Mark Unread
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DesktopTableView>

            <MobileCardStack>
              {notifications.map((notification) => (
                <MobileRecordCard
                  key={notification.id}
                  title={notification.clientName}
                  subtitle={notification.cycleLabel}
                  fields={[
                    {
                      label: "Date",
                      value: formatEditTimestamp(notification.createdAt),
                    },
                    {
                      label: "Type",
                      value: (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${invoiceNotificationTypeBadgeClass(notification.type)}`}
                        >
                          {notification.typeLabel}
                        </span>
                      ),
                    },
                    {
                      label: "Status",
                      value: (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${invoiceNotificationStatusBadgeClass(notification.status)}`}
                        >
                          {notification.statusLabel}
                        </span>
                      ),
                    },
                    { label: "Message", value: notification.message },
                  ]}
                  actions={
                    notification.status === "UNREAD" ? (
                      <Button
                        type="button"
                        loading={busyId === notification.id}
                        onClick={() => void handleStatusChange(notification.id, "read")}
                      >
                        Mark Read
                      </Button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === notification.id}
                        onClick={() => void handleStatusChange(notification.id, "unread")}
                        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#ebfbff]/20 px-4 py-2 text-sm font-semibold text-[#ebfbff] disabled:opacity-50"
                      >
                        Mark Unread
                      </button>
                    )
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
