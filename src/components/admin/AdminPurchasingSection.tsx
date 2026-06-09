"use client";

import { StockEditHistoryModal } from "@/components/admin/StockEditHistoryModal";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { formatAdminDate } from "@/lib/admin-format";
import type { InventoryItemDto } from "@/lib/inventory-service";
import { suggestedPurchaseQuantity } from "@/lib/inventory-service";
import { useCallback, useEffect, useState } from "react";

function formatInventoryDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// TODO: Restrict purchasing actions to admin role when RBAC is enabled.
export function AdminPurchasingSection() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryItemDto | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inventory/purchasing-list");
      if (!response.ok) {
        throw new Error("Unable to load reorder list.");
      }
      const data = (await response.json()) as { items: InventoryItemDto[] };
      setItems(data.items);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load reorder list.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function patchPurchasingAction(
    itemId: string,
    action: "MARK_ORDERED" | "EXCLUDE_FROM_LIST",
    successMessage: string,
  ) {
    setMessage(null);
    setActingId(itemId);

    try {
      const response = await fetch(`/api/inventory/${itemId}/purchasing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update reorder list.");
      }

      setMessage(successMessage);
      await loadItems();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update reorder list.",
      );
    } finally {
      setActingId(null);
    }
  }

  function handleOrdered(itemId: string) {
    void patchPurchasingAction(itemId, "MARK_ORDERED", "Item marked as ordered.");
  }

  function handleRemove(itemId: string) {
    void patchPurchasingAction(
      itemId,
      "EXCLUDE_FROM_LIST",
      "Item removed from reorder list.",
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-[#ebfbff]/55">
          Items at or below reorder level from shared Equipment &amp; Supplies inventory.
        </p>
        <button
          type="button"
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

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading reorder list…
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No items currently need reordering.
        </div>
      ) : (
        <>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll rounded-2xl">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
                    <th className="px-4 py-4 font-semibold">Category</th>
                    <th className="px-4 py-4 font-semibold">Current Quantity</th>
                    <th className="px-4 py-4 font-semibold">Reorder Level</th>
                    <th className="px-4 py-4 font-semibold">Suggested Purchase Quantity</th>
                    <th className="px-4 py-4 font-semibold">Unit</th>
                    <th className="px-4 py-4 font-semibold">Supplier</th>
                    <th className="px-4 py-4 font-semibold">Last Edited</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                    >
                      <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">{item.categoryLabel}</td>
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
                        {item.supplier ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {formatInventoryDate(item.lastEditedAt)}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => handleOrdered(item.id)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-50"
                          >
                            Mark Ordered
                          </button>
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => handleRemove(item.id)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-50"
                          >
                            Remove From List
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryTarget(item)}
                            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                          >
                            View Edit History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DesktopTableView>

          <MobileCardStack>
            {items.map((item) => (
              <MobileRecordCard
                key={item.id}
                title={item.itemName}
                subtitle={item.categoryLabel}
                fields={[
                  { label: "Current Quantity", value: item.availableQuantity },
                  { label: "Reorder Level", value: item.reorderLevel },
                  {
                    label: "Suggested Purchase Quantity",
                    value: suggestedPurchaseQuantity(
                      item.availableQuantity,
                      item.reorderLevel,
                    ),
                  },
                  { label: "Unit", value: item.unit },
                  { label: "Supplier", value: item.supplier ?? "—" },
                ]}
                detailFields={[
                  {
                    label: "Last Edited",
                    value: formatInventoryDate(item.lastEditedAt),
                  },
                  { label: "Item ID", value: item.id },
                ]}
                actions={
                  <>
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => handleOrdered(item.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] disabled:opacity-50"
                    >
                      Mark Ordered
                    </button>
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => handleRemove(item.id)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] disabled:opacity-50"
                    >
                      Remove From List
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTarget(item)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
                    >
                      View Edit History
                    </button>
                  </>
                }
              />
            ))}
          </MobileCardStack>
        </>
      )}

      <p className="text-xs text-[#ebfbff]/45">
        Generated {formatAdminDate(new Date().toISOString().slice(0, 10))} from
        reorder list.
      </p>

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
