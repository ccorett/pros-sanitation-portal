"use client";

import { formatEditTimestamp } from "@/lib/admin-format";
import type { AccountAuditHistoryRow } from "@/lib/admin-accounts-service";

type AccessHistoryModalProps = {
  employeeName: string;
  history: AccountAuditHistoryRow[];
  loading?: boolean;
  onClose: () => void;
};

export function AccessHistoryModal({
  employeeName,
  history,
  loading = false,
  onClose,
}: AccessHistoryModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#ebfbff]">
          Account History · {employeeName}
        </h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Role, responsibility, and account status changes.
        </p>

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[#ebfbff]/55">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-6 text-center text-sm text-[#ebfbff]/55">
              No account changes recorded yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#00c6ff]">
                      {entry.actionLabel}
                    </p>
                    <p className="text-xs text-[#ebfbff]/45">
                      {formatEditTimestamp(entry.changedAt)}
                    </p>
                  </div>
                  {entry.previousValue || entry.newValue ? (
                    <p className="mt-2 text-sm text-[#ebfbff]/75">
                      {entry.previousValue ?? "—"} → {entry.newValue ?? "—"}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-[#ebfbff]/45">
                    Changed by {entry.changedBy}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
