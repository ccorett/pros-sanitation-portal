"use client";

import {
  formatBinDate,
  serviceStatusLabel,
  statusColorClass,
} from "@/lib/bin-locations-status";
import { fetchBinFieldSites } from "@/lib/bin-service/field-client";
import { filterDueOverdueSites } from "@/lib/bin-service/field-filters";
import { formatBinFieldDate } from "@/lib/bin-service/field-format";
import type { BinFieldSiteRow } from "@/lib/bin-service/field-types";
import { useCallback, useEffect, useState } from "react";

export function AdminBinDueOverdueTable() {
  const [locations, setLocations] = useState<BinFieldSiteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sites = await fetchBinFieldSites();
      setLocations(filterDueOverdueSites(sites));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#ebfbff]">Due / Overdue Bins</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Route locations past service window — same data as technician Today&apos;s Jobs.
        </p>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading due and overdue bins…
        </div>
      ) : locations.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No bins are due or overdue right now.
        </div>
      ) : (
        <div className="glass-card portal-table-scroll rounded-2xl">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
                <th className="px-4 py-4 font-semibold">Last Service</th>
                <th className="px-4 py-4 font-semibold">Next Service</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Last Edited</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr
                  key={location.siteId}
                  className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                >
                  <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                    {location.location}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.lastServiceDate
                      ? formatBinDate(location.lastServiceDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatBinFieldDate(location.nextServiceDate)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorClass(location.rotation.color)}`}
                    >
                      {location.serviceStatus
                        ? serviceStatusLabel(location.serviceStatus)
                        : location.rotation.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.lastUpdatedAt
                      ? new Date(location.lastUpdatedAt).toLocaleString()
                      : "—"}
                    {location.lastUpdatedBy ? (
                      <p className="text-xs text-[#ebfbff]/45">
                        by {location.lastUpdatedBy}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => void refresh()}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh due / overdue list
      </button>
    </section>
  );
}
