"use client";

import {
  getPurchasingListItems,
  markPurchasingOrdered,
  removeFromPurchasingList,
} from "@/lib/admin-client-storage";
import {
  formatAdminDate,
  suggestedPurchaseQuantity,
  supplierByCategory,
} from "@/lib/admin-mock-data";
import type { InventoryItem } from "@/lib/equipment-supplies-mock-data";
import { useState } from "react";

export function AdminPurchasingSection() {
  const [items, setItems] = useState<InventoryItem[]>(() => getPurchasingListItems());
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setItems(getPurchasingListItems());
  }

  function handleOrdered(itemId: string) {
    markPurchasingOrdered(itemId);
    refresh();
    setMessage("Item marked as ordered.");
  }

  function handleRemove(itemId: string) {
    removeFromPurchasingList(itemId);
    refresh();
    setMessage("Item removed from purchasing list.");
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#ebfbff]">Purchasing List Generator</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Items at or below reorder level are suggested for purchase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMessage("Export list placeholder — coming soon.")}
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-5 py-3 text-sm font-semibold text-[#ebfbff]"
        >
          Export List
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No items currently need purchasing.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 font-semibold">Current Quantity</th>
                <th className="px-4 py-4 font-semibold">Reorder Level</th>
                <th className="px-4 py-4 font-semibold">Suggested Purchase Quantity</th>
                <th className="px-4 py-4 font-semibold">Unit</th>
                <th className="px-4 py-4 font-semibold">Supplier</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">{item.name}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.category}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.availableQuantity}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.reorderLevel}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {suggestedPurchaseQuantity(
                      item.availableQuantity,
                      item.reorderLevel,
                    )}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{item.unit}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {supplierByCategory[item.category]}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleOrdered(item.id)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Mark as Ordered
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                      >
                        Remove from List
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[#ebfbff]/45">
        Generated {formatAdminDate(new Date().toISOString().slice(0, 10))} from Equipment
        &amp; Supplies stock levels.
      </p>
    </section>
  );
}
