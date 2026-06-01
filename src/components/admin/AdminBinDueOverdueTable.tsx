"use client";

import {
  computeNextServiceDate,
  formatBinDate,
  getBinServiceStatus,
  serviceStatusLabel,
  statusColorClass,
} from "@/lib/bin-locations-status";
import { getDueAndOverdueLocations } from "@/lib/bin-locations-storage";
import { useEffect, useState } from "react";

export function AdminBinDueOverdueTable() {
  const [locations, setLocations] = useState(() => getDueAndOverdueLocations());

  useEffect(() => {
    function refresh() {
      setLocations(getDueAndOverdueLocations());
    }
    refresh();
    window.addEventListener("pros-bin-locations-updated", refresh);
    return () => window.removeEventListener("pros-bin-locations-updated", refresh);
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#ebfbff]">Due / Overdue Bins</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          Route locations past service window — same data as technician Today&apos;s Jobs.
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
          No bins are due or overdue right now.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto rounded-2xl">
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
              {locations.map((location) => {
                const rotation = getBinServiceStatus(location);
                const nextService = computeNextServiceDate(location.lastServiceDate);
                return (
                  <tr
                    key={location.id}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {location.location}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatBinDate(location.lastServiceDate)}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatBinDate(nextService)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorClass(rotation.color)}`}
                      >
                        {serviceStatusLabel(location.serviceStatus) ||
                          rotation.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {location.lastUpdatedAt
                        ? new Date(location.lastUpdatedAt).toLocaleString()
                        : "—"}
                      {location.lastUpdatedBy ? (
                        <span className="block text-xs text-[#ebfbff]/45">
                          {location.lastUpdatedBy}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
