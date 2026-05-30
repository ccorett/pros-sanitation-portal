"use client";

import {
  computeNextServiceDate,
  formatBinDate,
  getBinServiceStatus,
  statusColorClass,
  type BinServiceStatusColor,
} from "@/lib/bin-locations-status";
import type { BinLocationView } from "@/lib/bin-locations-storage";
import { getBinLocations } from "@/lib/bin-locations-storage";
import Link from "next/link";
import { useMemo, useState } from "react";

const STATUS_FILTERS: Array<{ value: "all" | BinServiceStatusColor; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: "green", label: "On Schedule" },
  { value: "yellow", label: "Due" },
  { value: "red", label: "Overdue" },
  { value: "grey", label: "Inactive" },
];

export function BinLocationsOverviewTable() {
  const [locations, setLocations] = useState<BinLocationView[]>(() => getBinLocations());
  const [search, setSearch] = useState("");
  const [notesSearch, setNotesSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BinServiceStatusColor>("all");
  const [lastServiceFilter, setLastServiceFilter] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const notesQuery = notesSearch.trim().toLowerCase();

    const items = locations.filter((location) => {
      const status = getBinServiceStatus(location);
      const matchesStatus =
        statusFilter === "all" || status.color === statusFilter;
      const matchesLocation =
        !query || location.location.toLowerCase().includes(query);
      const matchesNotes =
        !notesQuery ||
        location.notes.toLowerCase().includes(notesQuery) ||
        location.location.toLowerCase().includes(notesQuery);
      const matchesLastService =
        !lastServiceFilter || location.lastServiceDate === lastServiceFilter;

      return matchesStatus && matchesLocation && matchesNotes && matchesLastService;
    });

    const rank = (color: string) => {
      if (color === "red") return 0;
      if (color === "yellow") return 1;
      if (color === "grey") return 3;
      return 2;
    };

    return [...items].sort((a, b) => {
      const statusA = getBinServiceStatus(a);
      const statusB = getBinServiceStatus(b);
      const diff = rank(statusA.color) - rank(statusB.color);
      if (diff !== 0) return diff;
      return a.location.localeCompare(b.location);
    });
  }, [locations, search, notesSearch, statusFilter, lastServiceFilter]);

  return (
    <div className="space-y-4">
      <div className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Search by Location</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
              placeholder="Location name"
            />
          </label>
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Search / filter by Notes</span>
            <input
              type="search"
              value={notesSearch}
              onChange={(event) => setNotesSearch(event.target.value)}
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
              placeholder="Access notes, instructions..."
            />
          </label>
          <label className="block">
            <span className="text-sm text-[#ebfbff]/70">Filter by Last Service Date</span>
            <input
              type="date"
              value={lastServiceFilter}
              onChange={(event) => setLastServiceFilter(event.target.value)}
              className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
            />
          </label>
        </div>
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
          Green = 0–13 days · Yellow = 14–17 days · Red = 18+ days · Next service is 14 days
          after last service
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No locations match your filters.
        </div>
      ) : (
      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Location</th>
              <th className="px-4 py-4 font-semibold">New Bins</th>
              <th className="px-4 py-4 font-semibold">Regular Bins</th>
              <th className="px-4 py-4 font-semibold">Total Bins</th>
              <th className="px-4 py-4 font-semibold">Last Service Date</th>
              <th className="px-4 py-4 font-semibold">Next Service Date</th>
              <th className="px-4 py-4 font-semibold">Service Status</th>
              <th className="px-4 py-4 font-semibold">Notes</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((location) => {
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
                  <td className="px-4 py-4 text-[#ebfbff]/70">{location.newBins}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">{location.regularBins}</td>
                  <td className="px-4 py-4 text-[#ebfbff]/70">
                    {location.newBins + location.regularBins}
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
                  <td className="max-w-[220px] px-4 py-4 text-[#ebfbff]/70">
                    {location.notes || "—"}
                  </td>
                  <td className="px-4 py-4 sm:px-6">
                    <Link
                      href={`/jobs/bin-management/job/${location.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
                    >
                      Open Job
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <button
        type="button"
        onClick={() => setLocations(getBinLocations())}
        className="text-sm text-[#00c6ff] hover:text-[#6cc801]"
      >
        Refresh list
      </button>
    </div>
  );
}
