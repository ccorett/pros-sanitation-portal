"use client";

import { Button } from "@/components/ui/Button";
import {
  inventoryStatusClass,
  urgencyClass,
  urgencyOptions,
  type InventoryStatus,
  type InventoryUrgency,
} from "@/lib/equipment-supplies-mock-data";
import type { EquipmentRequestDto } from "@/lib/equipment-request-service";
import type { InventoryItemDto } from "@/lib/inventory-service";
import { formatEditTimestamp } from "@/lib/admin-format";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const INVENTORY_CATEGORY_FILTERS = [
  { value: "All", label: "All" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CHEMICALS", label: "Chemicals" },
  { value: "PPE", label: "PPE" },
  { value: "CONSUMABLES", label: "Consumables" },
] as const;

function requestStatusClass(status: string): string {
  if (status === "APPROVED" || status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "REJECTED" || status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (status === "FULFILLED" || status === "Fulfilled") {
    return "border-[#00c6ff]/35 bg-[#00c6ff]/15 text-[#00c6ff]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

export function InventorySection() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof INVENTORY_CATEGORY_FILTERS)[number]["value"]>("All");
  const [selectedItem, setSelectedItem] = useState<InventoryItemDto | null>(null);
  const [isRestock, setIsRestock] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<InventoryUrgency>("Normal");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requests, setRequests] = useState<EquipmentRequestDto[]>([]);
  const [inventory, setInventory] = useState<InventoryItemDto[]>([]);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);

    try {
      const response = await fetch("/api/equipment-requests");
      const data = (await response.json()) as {
        requests?: EquipmentRequestDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load recent requests.");
      }

      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/inventory");
      const data = (await response.json()) as {
        items?: InventoryItemDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load inventory.");
      }

      setInventory(data.items ?? []);
    } catch (fetchError) {
      setLoadError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
    void loadRequests();
  }, [loadInventory, loadRequests]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch =
        !query ||
        item.itemName.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query) ||
        item.storageArea.toLowerCase().includes(query) ||
        (item.supplier ?? "").toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [search, category, inventory]);

  function openRequestForm(item: InventoryItemDto, restock: boolean) {
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

  async function handleSubmitRequest(event: React.FormEvent) {
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

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/equipment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryItemId: selectedItem.id,
          quantityRequested: quantity,
          reason: reason.trim(),
          urgency,
        }),
      });

      const data = (await response.json()) as {
        request?: EquipmentRequestDto;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit request.");
      }

      await loadRequests();
      setSelectedItem(null);
      setSuccess(
        `${isRestock ? "Restock" : "Item"} request submitted for ${selectedItem.itemName}.`,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit request.",
      );
    } finally {
      setSubmitting(false);
    }
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
              placeholder="Search by item name, category, storage area, or supplier"
              className="w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 py-3 pl-12 pr-4 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            />
          </div>
        </label>

        <div className="mt-5">
          <p className="mb-2 text-sm text-[#ebfbff]/70">Browse categories</p>
          <div className="flex flex-wrap gap-2">
            {INVENTORY_CATEGORY_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={[
                  "min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                  category === option.value
                    ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                    : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70 hover:bg-[#ebfbff]/10",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {loadError}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading inventory…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No inventory items match your search.
        </div>
      ) : (
        <div className="glass-card portal-table-scroll rounded-2xl">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Item Name</th>
                <th className="px-4 py-4 font-semibold">Category</th>
                <th className="px-4 py-4 font-semibold">Available Quantity</th>
                <th className="px-4 py-4 font-semibold">Unit</th>
                <th className="px-4 py-4 font-semibold">Stock Status</th>
                <th className="px-4 py-4 font-semibold">Storage Area</th>
                <th className="px-4 py-4 font-semibold">Supplier</th>
                <th className="px-4 py-4 font-semibold">Last Updated</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const outOfStock = item.stockStatus === "Out of Stock";

                return (
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
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${inventoryStatusClass(item.stockStatus as InventoryStatus)}`}
                      >
                        {item.stockStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{item.storageArea}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {item.supplier ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatEditTimestamp(item.lastEditedAt ?? item.updatedAt)}
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

      {!requestsLoading && requests.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-[#ebfbff]">Recent Requests</h2>
          {requests.slice(0, 5).map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">{request.itemName}</h3>
                  <p className="mt-1 text-sm text-[#ebfbff]/60">
                    Qty {request.quantityRequested} {request.unit} · {request.reason}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${urgencyClass(request.urgencyLabel as InventoryUrgency)}`}
                  >
                    {request.urgencyLabel}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${requestStatusClass(request.status)}`}
                  >
                    {request.statusLabel}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Requested {formatEditTimestamp(request.createdAt)}
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
                <h2 className="mt-1 text-xl font-bold text-[#ebfbff]">
                  {selectedItem.itemName}
                </h2>
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
                <p className="mt-1 text-sm font-medium text-[#ebfbff]">
                  {selectedItem.itemName}
                </p>
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

            <Button
              type="submit"
              fullWidth
              className="mt-6 min-h-[56px] text-base"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
