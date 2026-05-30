"use client";

import { Button } from "@/components/ui/Button";
import { addInventoryRequest, getInventoryRequests } from "@/lib/equipment-client-storage";
import {
  formatInventoryDate,
  formatRequestDate,
  getInventoryStatus,
  inventoryCategories,
  inventoryItems,
  inventoryStatusClass,
  urgencyClass,
  urgencyOptions,
  type InventoryCategory,
  type InventoryItem,
  type InventoryRequest,
  type InventoryUrgency,
} from "@/lib/equipment-supplies-mock-data";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

type InventorySectionProps = {
  employeeRecordId: string;
};

export function InventorySection({ employeeRecordId }: InventorySectionProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InventoryCategory | "All">("All");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isRestock, setIsRestock] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<InventoryUrgency>("Normal");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<InventoryRequest[]>(() =>
    getInventoryRequests(employeeRecordId),
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventoryItems.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.storageArea.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  function openRequestForm(item: InventoryItem, restock: boolean) {
    setSelectedItem(item);
    setIsRestock(restock);
    setQuantity(1);
    setReason(restock ? "Restock required — item is out of stock." : "");
    setUrgency(restock ? "High" : "Normal");
    setError(null);
    setSuccess(null);
  }

  function closeRequestForm() {
    setSelectedItem(null);
  }

  function handleSubmitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedItem) return;

    if (quantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for this request.");
      return;
    }

    const updated = addInventoryRequest(employeeRecordId, {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity,
      reason: reason.trim(),
      urgency,
    });

    setRequests(updated);
    setSelectedItem(null);
    setSuccess(
      `${isRestock ? "Restock" : "Item"} request submitted for ${selectedItem.name}.`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <label className="block">
          <span className="text-sm font-medium text-[#ebfbff]/70">Search inventory</span>
          <div className="relative mt-2">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ebfbff]/40"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by item name or category"
              className="w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 py-3 pl-12 pr-4 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            />
          </div>
        </label>

        <div className="mt-5">
          <p className="mb-2 text-sm text-[#ebfbff]/70">Browse categories</p>
          <div className="flex flex-wrap gap-2">
            {(["All", ...inventoryCategories] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={[
                  "min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                  category === option
                    ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                    : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {success ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {success}
        </p>
      ) : null}

      {filteredItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No inventory items match your search.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 font-semibold">Available Quantity</th>
                <th className="px-4 py-4 font-semibold">Unit</th>
                <th className="px-4 py-4 font-semibold">Stock Status</th>
                <th className="px-4 py-4 font-semibold">Location/Storage Area</th>
                <th className="px-4 py-4 font-semibold">Last Updated</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status = getInventoryStatus(
                  item.availableQuantity,
                  item.reorderLevel,
                );
                const outOfStock = status === "Out of Stock";

                return (
                  <tr
                    key={item.id}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{item.category}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {item.availableQuantity}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{item.unit}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${inventoryStatusClass(status)}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{item.storageArea}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatInventoryDate(item.lastUpdated)}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <button
                        type="button"
                        onClick={() => openRequestForm(item, outOfStock)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20"
                      >
                        {outOfStock ? "Request Restock" : "Request Item"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {requests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Recent Requests</h2>
          {requests.slice(0, 5).map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">{request.itemName}</h3>
                  <p className="mt-1 text-sm text-[#ebfbff]/60">
                    Qty {request.quantity} · {request.reason}
                  </p>
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(request.urgency)}`}
                >
                  {request.urgency}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Submitted {formatRequestDate(request.submittedAt)}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <form
            onSubmit={handleSubmitRequest}
            className="glass-card w-full max-w-lg rounded-2xl p-5 sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#00c6ff]">
                  {isRestock ? "Request Restock" : "Request Item"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#ebfbff]">{selectedItem.name}</h2>
              </div>
              <button
                type="button"
                onClick={closeRequestForm}
                className="rounded-lg p-2 text-[#ebfbff]/60 hover:bg-[#ebfbff]/10"
                aria-label="Close request form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#ebfbff]/50">
                  Item
                </p>
                <p className="mt-1 text-sm font-medium text-[#ebfbff]">{selectedItem.name}</p>
              </div>

              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">Quantity</span>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#ebfbff]/15 bg-[#ebfbff]/5 text-2xl font-bold text-[#ebfbff]"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] text-center text-2xl font-bold text-[#ebfbff]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => value + 1)}
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/15 text-2xl font-bold text-[#6cc801]"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">Reason</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  required
                  className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
                  placeholder="Job site, restock, replacement, etc."
                />
              </label>

              <div>
                <p className="mb-2 text-sm text-[#ebfbff]/70">Urgency</p>
                <div className="grid grid-cols-3 gap-2">
                  {urgencyOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setUrgency(option)}
                      className={[
                        "min-h-[48px] rounded-xl border px-2 py-2 text-sm font-semibold",
                        urgency === option
                          ? urgencyClass(option)
                          : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
                      ].join(" ")}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth className="mt-6 min-h-[56px] text-base">
              Submit Request
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
