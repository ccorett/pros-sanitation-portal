"use client";

import {
  formatEditTimestamp,
  getEditHistoryForRecord,
  type EditHistoryEntry,
} from "@/lib/platform-edit-history";

type EditHistoryModalProps = {
  recordId: string;
  recordName: string;
  onClose: () => void;
};

export function EditHistoryModal({
  recordId,
  recordName,
  onClose,
}: EditHistoryModalProps) {
  const entries: EditHistoryEntry[] = getEditHistoryForRecord(recordId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#ebfbff]">Edit History · {recordName}</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Changes recorded for this item across admin sections.
        </p>

        <div className="mt-4 flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-6 text-center text-sm text-[#ebfbff]/55">
              No edit history recorded yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#00c6ff]">
                      {entry.actionType}
                    </p>
                    <p className="text-xs text-[#ebfbff]/45">
                      {formatEditTimestamp(entry.editedAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[#ebfbff]/70">
                    {entry.previousValue} → {entry.newValue}
                  </p>
                  <p className="mt-2 text-xs text-[#ebfbff]/45">
                    By {entry.editedBy}
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
