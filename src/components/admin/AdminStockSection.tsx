"use client";

import { EditHistoryModal } from "@/components/admin/EditHistoryModal";
import { Button } from "@/components/ui/Button";
import { formatInventoryDate } from "@/lib/equipment-supplies-mock-data";
import { authClient } from "@/lib/auth-client";
import {
  formatEditTimestamp,
  getAllManagedInventoryItems,
  updateStockItem,
} from "@/lib/platform-storage";
import { appendEditHistory } from "@/lib/platform-edit-history";
import { useEffect, useState } from "react";

type ManagedItem = ReturnType<typeof getAllManagedInventoryItems>[number];

// TODO: Restrict edit/disable to admin role when RBAC is enabled.
export function AdminStockSection() {
  const { data: session } = authClient.useSession();
  const editor =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Admin User";

  const [items, setItems] = useState<ManagedItem[]>(() =>
    typeof window !== "undefined" ? getAllManagedInventoryItems() : [],
  );
  const [editing, setEditing] = useState<ManagedItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ManagedItem | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(0);
  const [storageArea, setStorageArea] = useState("");

  useEffect(() => {
    function refresh() {
      setItems(getAllManagedInventoryItems());
    }
    refresh();
    window.addEventListener("pros-platform-data-updated", refresh);
    return () => window.removeEventListener("pros-platform-data-updated", refresh);
  }, []);

  function openEdit(item: ManagedItem) {
    setEditing(item);
    setQuantity(item.availableQuantity);
    setReorderLevel(item.reorderLevel);
    setStorageArea(item.storageArea);
  }

  function saveEdit() {
    if (!editing) return;
    setItems(
      updateStockItem(
        editing.id,
        {
          availableQuantity: quantity,
          reorderLevel,
          storageArea,
        },
        editor,
      ),
    );
    setEditing(null);
  }

  function disableItem(item: ManagedItem) {
    appendEditHistory({
      recordId: item.id,
      section: "Stock Management",
      recordName: item.name,
      actionType: "Disabled Item",
      previousValue: "Active",
      newValue: "Disabled",
      editedBy: editor,
    });
    setItems(updateStockItem(item.id, { disabled: true }, editor));
  }

  const visibleItems = items.filter((item) => !item.disabled);

  return (
    <section className="space-y-4">
      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
              <th className="px-4 py-4 font-semibold">Category</th>
              <th className="px-4 py-4 font-semibold">Available Quantity</th>
              <th className="px-4 py-4 font-semibold">Unit</th>
              <th className="px-4 py-4 font-semibold">Reorder Level</th>
              <th className="px-4 py-4 font-semibold">Storage Area</th>
              <th className="px-4 py-4 font-semibold">Last Edited</th>
              <th className="px-4 py-4 font-semibold">Edited By</th>
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
                  {item.lastEditedAt
                    ? formatEditTimestamp(item.lastEditedAt)
                    : formatInventoryDate(item.lastUpdated)}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.editedBy ?? "—"}</td>
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
                      onClick={() => disableItem(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                    >
                      Disable Item
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryTarget(item)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
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

      {historyTarget ? (
        <EditHistoryModal
          recordId={historyTarget.id}
          recordName={historyTarget.name}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}
    </section>
  );
}
