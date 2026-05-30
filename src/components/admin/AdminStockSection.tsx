"use client";

import { Button } from "@/components/ui/Button";
import {
  getAllManagedInventoryItems,
  updateStockItem,
} from "@/lib/admin-client-storage";
import { formatInventoryDate } from "@/lib/equipment-supplies-mock-data";
import { useState } from "react";

type ManagedItem = ReturnType<typeof getAllManagedInventoryItems>[number];

export function AdminStockSection() {
  const [items, setItems] = useState<ManagedItem[]>(() => getAllManagedInventoryItems());
  const [editing, setEditing] = useState<ManagedItem | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [storageArea, setStorageArea] = useState("");

  function openEdit(item: ManagedItem) {
    setEditing(item);
    setQuantity(item.availableQuantity);
    setReorderLevel(item.reorderLevel);
    setStorageArea(item.storageArea);
  }

  function saveEdit() {
    if (!editing) return;
    setItems(
      updateStockItem(editing.id, {
        availableQuantity: quantity,
        reorderLevel,
        storageArea,
      }),
    );
    setEditing(null);
  }

  function markReordered(itemId: string) {
    setItems(updateStockItem(itemId, { reordered: true }));
  }

  function disableItem(itemId: string) {
    setItems(updateStockItem(itemId, { disabled: true }));
  }

  const visibleItems = items.filter((item) => !item.disabled);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#ebfbff]">Stock Management</h2>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Edit inventory quantities and reorder levels from the Equipment &amp; Supplies catalogue.
        </p>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
              <th className="px-4 py-4 font-semibold">Category</th>
              <th className="px-4 py-4 font-semibold">Available Quantity</th>
              <th className="px-4 py-4 font-semibold">Unit</th>
              <th className="px-4 py-4 font-semibold">Reorder Level</th>
              <th className="px-4 py-4 font-semibold">Storage Area</th>
              <th className="px-4 py-4 font-semibold">Last Updated</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">{item.name}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.category}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.availableQuantity}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.unit}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.reorderLevel}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.storageArea}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatInventoryDate(item.lastUpdated)}
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                    >
                      Edit Stock
                    </button>
                    <button
                      type="button"
                      onClick={() => markReordered(item.id)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                    >
                      Mark Reordered
                    </button>
                    <button
                      type="button"
                      onClick={() => disableItem(item.id)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                    >
                      Disable Item
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg space-y-4 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">Edit Stock · {editing.name}</h3>
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
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" fullWidth onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="button" fullWidth onClick={saveEdit}>
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
