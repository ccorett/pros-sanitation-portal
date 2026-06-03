"use client";

import { StockEditHistoryModal } from "@/components/admin/StockEditHistoryModal";
import { Button } from "@/components/ui/Button";
import {
  inventoryStatusClass,
  type InventoryStatus,
} from "@/lib/equipment-supplies-mock-data";
import type { InventoryItemDto } from "@/lib/inventory-service";
import { formatEditTimestamp } from "@/lib/admin-format";
import { useCallback, useEffect, useState } from "react";

// TODO: Restrict edit/disable to admin role when RBAC is enabled.
export function AdminStockSection() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<InventoryItemDto | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryItemDto | null>(
    null,
  );
  const [quantity, setQuantity] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [storageArea, setStorageArea] = useState("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/inventory");
      const data = (await response.json()) as {
        items?: InventoryItemDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load inventory.");
      }

      setItems(data.items ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function openEdit(item: InventoryItemDto) {
    setEditing(item);
    setQuantity(item.availableQuantity);
    setReorderLevel(item.reorderLevel);
    setStorageArea(item.storageArea);
    setSupplier(item.supplier ?? "");
    setMessage(null);
  }

  async function saveEdit() {
    if (!editing) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/inventory/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availableQuantity: quantity,
          reorderLevel,
          storageArea,
          supplier: supplier.trim() || null,
        }),
      });

      const data = (await response.json()) as {
        item?: InventoryItemDto;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save stock changes.");
      }

      if (data.item) {
        setItems((current) =>
          current.map((row) => (row.id === data.item!.id ? data.item! : row)),
        );
      } else {
        await loadItems();
      }

      setEditing(null);
      setMessage("Stock updated.");
    } catch (saveError) {
      setMessage(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save stock changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function disableItem(item: InventoryItemDto) {
    setMessage(null);

    try {
      const response = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to disable item.");
      }

      setItems((current) => current.filter((row) => row.id !== item.id));
      setMessage(`${item.itemName} disabled.`);
    } catch (disableError) {
      setMessage(
        disableError instanceof Error
          ? disableError.message
          : "Unable to disable item.",
      );
    }
  }

  return (
    <section className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#00c6ff]/30 bg-[#00c6ff]/10 px-4 py-3 text-sm text-[#00c6ff]">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      <div className="glass-card portal-table-scroll rounded-2xl">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
              <th className="px-4 py-4 font-semibold">Category</th>
              <th className="px-4 py-4 font-semibold">Available Quantity</th>
              <th className="px-4 py-4 font-semibold">Unit</th>
              <th className="px-4 py-4 font-semibold">Reorder Level</th>
              <th className="px-4 py-4 font-semibold">Stock Status</th>
              <th className="px-4 py-4 font-semibold">Storage Area</th>
              <th className="px-4 py-4 font-semibold">Supplier</th>
              <th className="px-4 py-4 font-semibold">Last Edited</th>
              <th className="px-4 py-4 font-semibold">Edited By</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-[#ebfbff]/55 sm:px-6"
                >
                  Loading inventory from database…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-[#ebfbff]/55 sm:px-6"
                >
                  No active inventory items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                    {item.itemName}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.categoryLabel}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {item.availableQuantity}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.unit}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.reorderLevel}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${inventoryStatusClass(item.stockStatus as InventoryStatus)}`}
                    >
                      {item.stockStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.storageArea}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {item.supplier ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {item.lastEditedAt
                      ? formatEditTimestamp(item.lastEditedAt)
                      : formatEditTimestamp(item.updatedAt)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {item.lastEditedBy ?? "—"}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Edit Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => void disableItem(item)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Disable Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTarget(item)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        View Edit History
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">
              Edit Stock · {editing.itemName}
            </h3>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Available Quantity</span>
              <input
                type="number"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Reorder Level</span>
              <input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(event) => setReorderLevel(Number(event.target.value))}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Storage Area</span>
              <input
                value={storageArea}
                onChange={(event) => setStorageArea(event.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Supplier</span>
              <input
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-[#ebfbff]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" fullWidth onClick={() => void saveEdit()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {historyTarget ? (
        <StockEditHistoryModal
          itemId={historyTarget.id}
          itemName={historyTarget.itemName}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}
    </section>
  );
}
