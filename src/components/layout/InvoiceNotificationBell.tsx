"use client";

import {
  invoiceNotificationStatusBadgeClass,
  invoiceNotificationTypeBadgeClass,
} from "@/lib/invoice-notification-format";
import type { InvoiceNotificationRow } from "@/lib/invoice-notification-service";
import { formatEditTimestamp } from "@/lib/admin-format";
import {
  ACTIVITY_POPUP_SCRIM_CLASS,
  ACTIVITY_POPUP_SURFACE_CLASS,
} from "@/lib/floating-panel-styles";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const INVOICE_NOTIFICATIONS_HREF = "/admin/invoices?tab=notifications";

export function InvoiceNotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<InvoiceNotificationRow[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/invoices/notifications?filter=all&limit=8",
        { cache: "no-store" },
      );
      const raw = await response.text();
      const data = raw
        ? (JSON.parse(raw) as {
            notifications?: InvoiceNotificationRow[];
            unreadCount?: number;
            error?: string;
          })
        : {};
      if (!response.ok) {
        return;
      }
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!open) {
      return;
    }

    void loadSummary();

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, loadSummary]);

  return (
    <>
      {open ? (
        <div className={ACTIVITY_POPUP_SCRIM_CLASS} aria-hidden="true" />
      ) : null}

      <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread invoice notifications`
            : "Invoice notifications"
        }
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#ebfbff]/15 bg-[#0c151d]/50 text-[#ebfbff]/75 transition-colors hover:border-[#00c6ff]/35 hover:text-[#ebfbff]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#ff4d4f]/50 bg-[#ff4d4f] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl ${ACTIVITY_POPUP_SURFACE_CLASS}`}
        >
          <div className="border-b border-[#ebfbff]/10 px-4 py-3">
            <p className="text-sm font-bold text-[#ebfbff]">Invoice Notifications</p>
            <p className="mt-0.5 text-xs text-[#ebfbff]/50">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "No unread notifications"}
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-[#ebfbff]/50">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#ebfbff]/50">
                No invoice notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#ebfbff]/8">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={INVOICE_NOTIFICATIONS_HREF}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors hover:bg-[#ebfbff]/5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#ebfbff]">
                          {notification.clientName}
                        </p>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${invoiceNotificationTypeBadgeClass(notification.type)}`}
                        >
                          {notification.typeLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#ebfbff]/70">{notification.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#ebfbff]/45">
                        <span>{formatEditTimestamp(notification.createdAt)}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-semibold ${invoiceNotificationStatusBadgeClass(notification.status)}`}
                        >
                          {notification.statusLabel}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#ebfbff]/10 px-4 py-3">
            <Link
              href={INVOICE_NOTIFICATIONS_HREF}
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[40px] w-full items-center justify-center rounded-lg border border-[#6cc801]/40 bg-[#6cc801]/10 text-sm font-semibold text-[#ebfbff] hover:bg-[#6cc801]/20"
            >
              View all invoice notifications
            </Link>
          </div>
        </div>
      ) : null}
      </div>
    </>
  );
}
