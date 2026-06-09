"use client";

import { BinServiceUpdateModal } from "@/components/bin-service/BinServiceUpdateModal";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import {
  formatBinDate,
  serviceStatusLabel,
  statusColorClass,
  type BinServiceStatusColor,
} from "@/lib/bin-locations-status";
import { fetchBinFieldSites } from "@/lib/bin-service/field-client";
import { formatBinFieldDate } from "@/lib/bin-service/field-format";
import type { BinFieldSiteRow } from "@/lib/bin-service/field-types";
import { useCallback, useEffect, useMemo, useState } from "react";

const STATUS_FILTERS: Array<{ value: "all" | BinServiceStatusColor; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "green", label: "On Schedule" },
  { value: "yellow", label: "Due" },
  { value: "red", label: "Overdue" },
  { value: "orange", label: "Needs Attention" },
  { value: "grey", label: "Inactive" },
];

type BinTechnicianServiceTableProps = {
  readOnlySetup?: boolean;
};

export function BinTechnicianServiceTable({
  readOnlySetup = false,
}: BinTechnicianServiceTableProps) {
  const [locations, setLocations] = useState<BinFieldSiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BinServiceStatusColor>("all");
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const items = locations.filter((location) => {
      const matchesStatus =
        statusFilter === "all" || location.rotation.color === statusFilter;
      const matchesLocation =
        !query ||
        location.location.toLowerCase().includes(query) ||
        location.displayNotes.toLowerCase().includes(query);

      return matchesStatus && matchesLocation;
    });

    const rank = (color: string) => {
      if (color === "orange") return 0;
      if (color === "red") return 1;
      if (color === "yellow") return 2;
      if (color === "grey") return 4;
      return 3;
    };

    return [...items].sort((a, b) => {
      const diff = rank(a.rotation.color) - rank(b.rotation.color);
      if (diff !== 0) return diff;
      return a.location.localeCompare(b.location);
    });
  }, [locations, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <p className="text-sm text-[#ebfbff]/70">
          {readOnlySetup
            ? "Update assigned service activity only. Adding locations and changing bin setup are restricted for your role."
            : "Update service activity and review all route locations."}
        </p>
        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Search by Location or Notes</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            placeholder="Location name or notes"
          />
        </label>
        <div>
          <p className="mb-2 text-sm text-[#ebfbff]/70">Filter by Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={[
                  "min-h-[44px] rounded-xl border px-4 py-2 text-sm font-semibold",
                  statusFilter === option.value
                    ? "border-[#6cc801]/50 bg-[#6cc801]/15 text-[#6cc801]"
                    : "border-[#ebfbff]/15 bg-[#ebfbff]/5 text-[#ebfbff]/70",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#ebfbff]/45">
          Status colours follow schedule: green on schedule, yellow due, red overdue,
          orange cannot access / issue reported.
        </p>
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading bin locations…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No active locations match your filters.
        </div>
      ) : (
        <>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll rounded-2xl">
              <table className="min-w-[1200px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                    <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
                    <th className="px-4 py-4 font-semibold">New Bins Expected</th>
                    <th className="px-4 py-4 font-semibold">Regular Bins Expected</th>
                    <th className="px-4 py-4 font-semibold">Total Bins</th>
                    <th className="px-4 py-4 font-semibold">Last Service Date</th>
                    <th className="px-4 py-4 font-semibold">Next Service Date</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Notes</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((location) => (
                    <tr
                      key={location.siteId}
                      className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                    >
                      <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                        {location.location}
                      </td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">{location.newBins}</td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">{location.regularBins}</td>
                      <td className="px-4 py-4 text-[#ebfbff]/70">
                        {location.newBins + location.regularBins}
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
                        {location.serviceStatus ? (
                          <p className="mt-1 text-xs text-[#ebfbff]/45">
                            {serviceStatusLabel(location.serviceStatus)}
                          </p>
                        ) : null}
                      </td>
                      <td className="max-w-[220px] px-4 py-4 text-[#ebfbff]/70">
                        {location.serviceNotes || location.displayNotes || "—"}
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
          </DesktopTableView>

          <MobileCardStack>
            {filtered.map((location) => (
              <MobileRecordCard
                key={location.siteId}
                title={location.location}
                headerExtra={
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusColorClass(location.rotation.color)}`}
                  >
                    {location.rotation.label}
                  </span>
                }
                fields={[
                  {
                    label: "Total Bins",
                    value: location.newBins + location.regularBins,
                  },
                  { label: "New Bins", value: location.newBins },
                  { label: "Regular Bins", value: location.regularBins },
                  {
                    label: "Last Service",
                    value: location.lastServiceDate
                      ? formatBinDate(location.lastServiceDate)
                      : "—",
                  },
                  {
                    label: "Next Service",
                    value: formatBinFieldDate(location.nextServiceDate),
                  },
                ]}
                detailFields={[
                  ...(location.serviceStatus
                    ? [
                        {
                          label: "Service Status",
                          value: serviceStatusLabel(location.serviceStatus),
                        },
                      ]
                    : []),
                  {
                    label: "Notes",
                    value: location.serviceNotes || location.displayNotes || "—",
                  },
                ]}
                actions={
                  <button
                    type="button"
                    onClick={() => setActiveLocation(location)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                  >
                    Update Service
                  </button>
                }
              />
            ))}
          </MobileCardStack>
        </>
      )}

      <button
        type="button"
        onClick={() => void refresh()}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh list
      </button>

      {activeLocation ? (
        <BinServiceUpdateModal
          location={activeLocation}
          onClose={() => setActiveLocation(null)}
          onSaved={() => void refresh()}
        />
      ) : null}
    </div>
  );
}
