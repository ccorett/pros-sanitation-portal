"use client";

import { BinServiceUpdateModal } from "@/components/bin-service/BinServiceUpdateModal";
import {
  formatBinDate,
  formatBinDateTime,
  serviceStatusLabel,
  statusColorClass,
} from "@/lib/bin-locations-status";
import { fetchBinFieldSites } from "@/lib/bin-service/field-client";
import { formatBinFieldDate } from "@/lib/bin-service/field-format";
import type { BinFieldSiteRow } from "@/lib/bin-service/field-types";
import { useCallback, useEffect, useState } from "react";

export function AdminBinRouteLocationsTable() {
  const [locations, setLocations] = useState<BinFieldSiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLocation, setActiveLocation] = useState<BinFieldSiteRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLocations(await fetchBinFieldSites());
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
        <h3 className="text-lg font-bold text-[#ebfbff]">Bin Route Service Activity</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          View and update service fields and notes for all route locations. Changes
          are saved and visible across devices.
        </p>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          Loading route activity…
        </div>
      ) : (
        <div className="glass-card portal-table-scroll rounded-2xl">
          <table className="min-w-[1500px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
                <th className="px-4 py-4 font-semibold">Last Updated By</th>
                <th className="px-4 py-4 font-semibold">Last Updated</th>
                <th className="px-4 py-4 font-semibold">Service Status</th>
                <th className="px-4 py-4 font-semibold">Notes</th>
                <th className="px-4 py-4 font-semibold">Issue / Access</th>
                <th className="px-4 py-4 font-semibold">Last Service</th>
                <th className="px-4 py-4 font-semibold">Next Service</th>
                <th className="px-4 py-4 font-semibold">Rotation Status</th>
                <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
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
                    {location.lastUpdatedBy ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.lastUpdatedAt
                      ? formatBinDateTime(location.lastUpdatedAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.serviceStatus
                      ? serviceStatusLabel(location.serviceStatus)
                      : "—"}
                  </td>
                  <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                    {location.serviceNotes || location.displayNotes || "—"}
                  </td>
                  <td className="max-w-[200px] px-4 py-4 text-[#ebfbff]/70">
                    {location.cannotAccessReason ??
                      location.issueNotes ??
                      "—"}
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
                      {location.rotation.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <button
                      type="button"
                      onClick={() => setActiveLocation(location)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                    >
                      Update Service
                    </button>
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
        Refresh route activity
      </button>

      {activeLocation ? (
        <BinServiceUpdateModal
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </section>
  );
}
