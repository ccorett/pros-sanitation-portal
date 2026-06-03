"use client";

import { BinServiceUpdateModal } from "@/components/bin-service/BinServiceUpdateModal";
import {
  formatBinDate,
  formatBinDateTime,
  serviceStatusLabel,
} from "@/lib/bin-locations-status";
import { fetchBinFieldAttention, fetchBinFieldSites } from "@/lib/bin-service/field-client";
import { readInboxFocusParams } from "@/lib/inbox-focus";
import { formatBinFieldDate } from "@/lib/bin-service/field-format";
import type { BinFieldAttentionItem, BinFieldSiteRow } from "@/lib/bin-service/field-types";
import { useCallback, useEffect, useState } from "react";

export function AdminBinAttentionSection() {
  const [items, setItems] = useState<BinFieldAttentionItem[]>([]);
  const [sites, setSites] = useState<BinFieldSiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<BinFieldSiteRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [attention, allSites] = await Promise.all([
        fetchBinFieldAttention(),
        fetchBinFieldSites(),
      ]);
      setItems(attention);
      setSites(allSites);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const { siteId } = readInboxFocusParams();
    if (!siteId || sites.length === 0) return;
    const location = sites.find((site) => site.siteId === siteId);
    if (location) {
      setActiveLocation(location);
    }
  }, [sites]);

  function openUpdate(siteId: string) {
    const location = sites.find((site) => site.siteId === siteId);
    if (location) {
      setActiveLocation(location);
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
        Loading attention queue…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
        No bin service locations need admin attention right now.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card portal-table-scroll rounded-2xl">
        <table className="min-w-[1300px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
              <th className="px-4 py-4 font-semibold">Service Status</th>
              <th className="px-4 py-4 font-semibold">Last Updated By</th>
              <th className="px-4 py-4 font-semibold">Last Updated</th>
              <th className="px-4 py-4 font-semibold">Notes</th>
              <th className="px-4 py-4 font-semibold">Issue / Cannot Access</th>
              <th className="px-4 py-4 font-semibold">Last Service</th>
              <th className="px-4 py-4 font-semibold">Next Service</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.siteId}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                  {item.locationName}
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full border border-[#f97316]/35 bg-[#f97316]/15 px-3 py-1 text-xs font-semibold text-[#f97316]">
                    {serviceStatusLabel(item.serviceStatus)}
                  </span>
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {item.lastUpdatedBy ?? "—"}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {item.lastUpdatedAt
                    ? formatBinDateTime(item.lastUpdatedAt)
                    : "—"}
                </td>
                <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                  {item.notes || "—"}
                </td>
                <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                  {item.issueOrAccessReason}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {item.lastServiceDate
                    ? formatBinDate(item.lastServiceDate)
                    : "—"}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatBinFieldDate(item.nextServiceDate)}
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => openUpdate(item.siteId)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                  >
                    Update Service
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[#ebfbff]/10 px-4 py-3">
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
          >
            Refresh attention queue
          </button>
        </div>
      </div>

      {activeLocation ? (
        <BinServiceUpdateModal
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </>
  );
}
