"use client";

import { formatEditTimestamp } from "@/lib/admin-format";
import type { StockEditHistoryDto } from "@/lib/inventory-service";
import { useEffect, useState } from "react";

type StockEditHistoryModalProps = {
  itemId: string;
  itemName: string;
  onClose: () => void;
};

export function StockEditHistoryModal({
  itemId,
  itemName,
  onClose,
}: StockEditHistoryModalProps) {
  const [entries, setEntries] = useState<StockEditHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/inventory/${itemId}/history`);
        const data = (await response.json()) as {
          history?: StockEditHistoryDto[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load edit history.");
        }

        if (!cancelled) {
          setEntries(data.history ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load edit history.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-card flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl p-5 sm:p-6">
        <h3 className="text-lg font-bold text-[#ebfbff]">Edit History · {itemName}</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Stock changes recorded for this inventory item.
        </p>

        <div className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <p className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-6 text-center text-sm text-[#ebfbff]/55">
              Loading edit history…
            </p>
          ) : error ? (
            <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-6 text-center text-sm text-[#ff4d4f]">
              {error}
            </p>
          ) : entries.length === 0 ? (
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
                    <p className="text-sm font-semibold text-[#00c6ff]">Stock Update</p>
                    <p className="text-xs text-[#ebfbff]/45">
                      {formatEditTimestamp(entry.editedAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-[#ebfbff]/70">{entry.summary}</p>
                  <p className="mt-2 text-xs text-[#ebfbff]/45">By {entry.editedBy}</p>
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
