"use client";

import type { ApprovalInboxItem } from "@/lib/approval-inbox-service";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function statusClass(status: string): string {
  if (status === "Pending" || status.includes("Pending")) {
    return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
  }
  if (status === "Approved" || status === "Aware") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected" || status === "Unaware") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  if (status.includes("Cannot Access") || status.includes("Issue")) {
    return "border-[#ff8c42]/35 bg-[#ff8c42]/15 text-[#ff8c42]";
  }
  return "border-[#ebfbff]/20 bg-[#ebfbff]/10 text-[#ebfbff]/70";
}

export function ApprovalInboxSection() {
  const [items, setItems] = useState<ApprovalInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/approval-inbox");
      const data = (await response.json()) as {
        items?: ApprovalInboxItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load approval inbox.");
      }
      setItems(data.items ?? []);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load approval inbox.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        Loading approval inbox…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ff4d4f]">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        No items need review right now. New requests from Neon-backed modules will
        appear here.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="glass-card portal-table-scroll rounded-2xl">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Type</th>
              <th className="px-4 py-4 font-semibold">Submitted By</th>
              <th className="px-4 py-4 font-semibold">Location</th>
              <th className="px-4 py-4 font-semibold">Date Submitted</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={`${item.type}-${item.id}`}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                  {item.typeLabel}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.submittedBy}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.location}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{item.dateSubmitted}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(item.status)}`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <Link
                    href={item.actionHref}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                  >
                    Open Record
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void loadItems()}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh inbox
      </button>
    </section>
  );
}
