"use client";

import { BinServiceUpdateModal } from "@/components/bin-service/BinServiceUpdateModal";
import {
  computeNextServiceDate,
  formatBinDate,
  formatBinDateTime,
  getBinServiceStatus,
  serviceStatusLabel,
  statusColorClass,
} from "@/lib/bin-locations-status";
import { getBinLocations, type BinLocationView } from "@/lib/bin-locations-storage";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export function AdminBinRouteLocationsTable() {
  const { data: session } = authClient.useSession();
  const updatedBy =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Admin";

  const [locations, setLocations] = useState(() => getBinLocations());
  const [activeLocation, setActiveLocation] = useState<BinLocationView | null>(
    null,
  );

  function refresh() {
    setLocations(getBinLocations());
  }

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("pros-bin-locations-updated", handler);
    return () => window.removeEventListener("pros-bin-locations-updated", handler);
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#ebfbff]">Bin Route Service Activity</h3>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          View and update service fields and notes for all route locations. Changes
          sync with Bin Management immediately.
        </p>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl">
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
            {locations.map((location) => {
              const status = getBinServiceStatus(location);
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
                  <td className="max-w-[180px] px-4 py-4 text-[#ebfbff]/70">
                    {location.displayNotes || "—"}
                  </td>
                  <td className="max-w-[180px] px-4 py-4 text-[#ebfbff]/70">
                    {location.cannotAccessReason ??
                      location.issueNotes ??
                      "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatBinDate(location.lastServiceDate)}
                  </td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {formatBinDate(nextService)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorClass(status.color)}`}
                    >
                      {status.label}
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
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={refresh}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh route data
      </button>

      {activeLocation ? (
        <BinServiceUpdateModal
          location={activeLocation}
          updatedBy={`Admin: ${updatedBy}`}
          onClose={() => setActiveLocation(null)}
          onSaved={refresh}
        />
      ) : null}
    </section>
  );
}
