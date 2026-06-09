"use client";

import { AddBinSiteForm } from "@/components/bin-service/AddBinSiteForm";
import { Button } from "@/components/ui/Button";
import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { formatEditTimestamp } from "@/lib/admin-format";
import {
  filterAdminBinLocationRows,
  type AdminBinLocationRow,
} from "@/lib/admin-bin-locations-service";
import {
  formatShortDate,
  SERVICE_DAY_OPTIONS,
  WEEK_PATTERN_OPTIONS,
} from "@/lib/bin-service/schedule";
import { getRotationStatusStyles } from "@/lib/bin-service/status";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  return formatShortDate(new Date(`${iso}T00:00:00.000Z`));
}

const EMPTY_FILTERS = {
  search: "",
  status: "all",
  dueOverdue: "all",
  weekPattern: "all",
  serviceDay: "all",
  minTotalBins: "",
  maxTotalBins: "",
  lastServicedFrom: "",
  lastServicedTo: "",
  showRemoved: false,
};

export function AdminBinManagementSection() {
  const [rows, setRows] = useState<AdminBinLocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewTarget, setViewTarget] = useState<AdminBinLocationRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/bin-service/admin/locations");
      const data = (await response.json()) as {
        rows?: AdminBinLocationRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load bin locations.");
      }
      setRows(data.rows ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load bin locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(
    () => filterAdminBinLocationRows(rows, filters),
    [rows, filters],
  );

  const statusOptions = useMemo(() => {
    const labels = new Set(rows.map((row) => row.statusLabel));
    labels.add("Removed");
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  async function handleDelete(row: AdminBinLocationRow) {
    const confirmed = window.confirm(
      `Remove "${row.location}" from active bin routes?\n\nService history will be kept. This location will be hidden from technician views.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(row.siteId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/bin-service/sites/${row.siteId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove bin location.");
      }
      setMessage(`"${row.location}" was marked as removed.`);
      await loadRows();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove bin location.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderActions(row: AdminBinLocationRow) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewTarget(row)}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ebfbff]/20 bg-[#ebfbff]/5 px-3 py-2 text-xs font-semibold text-[#ebfbff] hover:bg-[#ebfbff]/10"
        >
          View
        </button>
        {!row.removedAt ? (
          <Link
            href={`/jobs/bin-management/setup/${row.siteId}?from=admin`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] hover:bg-[#00c6ff]/20"
          >
            Edit
          </Link>
        ) : null}
        {!row.removedAt ? (
          <button
            type="button"
            disabled={deletingId === row.siteId}
            onClick={() => void handleDelete(row)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] hover:bg-[#ff4d4f]/20 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#ebfbff]">Bin Management</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Search, filter, and manage all bin service locations in one place.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px]"
          onClick={() => setShowAddForm((current) => !current)}
        >
          {showAddForm ? "Hide Add Form" : "Add Bin Location"}
        </Button>
      </div>

      {showAddForm ? <AddBinSiteForm onCreated={() => void loadRows()} /> : null}

      <div className="glass-card space-y-4 rounded-2xl p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[#ebfbff]">Filters</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="text-xs text-[#ebfbff]/55">Search location</span>
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Location name"
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Due / Overdue</span>
            <select
              value={filters.dueOverdue}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dueOverdue: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            >
              <option value="all">All</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
              <option value="due_or_overdue">Due or Overdue</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Service week pattern</span>
            <select
              value={filters.weekPattern}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  weekPattern: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            >
              <option value="all">All patterns</option>
              {WEEK_PATTERN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Service day</span>
            <select
              value={filters.serviceDay}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  serviceDay: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            >
              <option value="all">All days</option>
              {SERVICE_DAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Min total bins</span>
            <input
              type="number"
              min={0}
              value={filters.minTotalBins}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  minTotalBins: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Max total bins</span>
            <input
              type="number"
              min={0}
              value={filters.maxTotalBins}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  maxTotalBins: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Last serviced from</span>
            <input
              type="date"
              value={filters.lastServicedFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  lastServicedFrom: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#ebfbff]/55">Last serviced to</span>
            <input
              type="date"
              value={filters.lastServicedTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  lastServicedTo: event.target.value,
                }))
              }
              className="mt-1 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-3 py-2 text-sm text-[#ebfbff]"
            />
          </label>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-[#ebfbff]/70">
          <input
            type="checkbox"
            checked={filters.showRemoved}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                showRemoved: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-[#ebfbff]/20"
          />
          Show removed locations
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          Loading bin locations…
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
          No bin locations match your filters.
        </div>
      ) : (
        <>
          <p className="text-sm text-[#ebfbff]/55">
            Showing {filteredRows.length} of {rows.length} locations
          </p>
          <DesktopTableView>
            <div className="glass-card portal-table-scroll rounded-2xl">
              <table className="min-w-[1400px] w-full text-left text-sm">
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
                    <th className="px-4 py-4 font-semibold">Last Edited</th>
                    <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const styles = getRotationStatusStyles(row.rotation.color);
                    return (
                      <tr
                        key={row.siteId}
                        className={`border-b border-[#ebfbff]/5 last:border-b-0 border-l-4 ${styles.border} hover:bg-[#ebfbff]/[0.03]`}
                      >
                        <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                          {row.location}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {row.newBinsExpected}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {row.regularBinsExpected}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">{row.totalBins}</td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {formatDisplayDate(row.lastServiceDate)}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {formatDisplayDate(row.nextServiceDate)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
                          >
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-4 text-[#ebfbff]/70">
                          {row.notes || "—"}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {row.lastEditedAt
                            ? formatEditTimestamp(row.lastEditedAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex flex-wrap gap-2">
                            {renderActions(row)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DesktopTableView>

          <MobileCardStack>
            {filteredRows.map((row) => {
              const styles = getRotationStatusStyles(row.rotation.color);
              return (
                <MobileRecordCard
                  key={row.siteId}
                  title={row.location}
                  subtitle={row.clientName}
                  headerExtra={
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}
                    >
                      {row.statusLabel}
                    </span>
                  }
                  fields={[
                    { label: "New Bins", value: row.newBinsExpected },
                    { label: "Regular Bins", value: row.regularBinsExpected },
                    { label: "Total Bins", value: row.totalBins },
                    {
                      label: "Last Service",
                      value: formatDisplayDate(row.lastServiceDate),
                    },
                    {
                      label: "Next Service",
                      value: formatDisplayDate(row.nextServiceDate),
                    },
                  ]}
                  detailFields={[
                    { label: "Notes", value: row.notes || "—" },
                    {
                      label: "Last Edited",
                      value: row.lastEditedAt
                        ? formatEditTimestamp(row.lastEditedAt)
                        : "—",
                    },
                    {
                      label: "Schedule",
                      value:
                        row.weekPatternLabel && row.serviceDayLabel
                          ? `${row.weekPatternLabel} · ${row.serviceDayLabel}`
                          : "—",
                    },
                  ]}
                  actions={renderActions(row)}
                />
              );
            })}
          </MobileCardStack>
        </>
      )}

      {viewTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">{viewTarget.location}</h3>
            <dl className="mt-4 space-y-2 text-sm text-[#ebfbff]/75">
              <div>
                <dt className="text-[#ebfbff]/45">Client</dt>
                <dd>{viewTarget.clientName}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Bins</dt>
                <dd>
                  {viewTarget.newBinsExpected} new · {viewTarget.regularBinsExpected}{" "}
                  regular · {viewTarget.totalBins} total
                </dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Schedule</dt>
                <dd>
                  {viewTarget.weekPatternLabel && viewTarget.serviceDayLabel
                    ? `${viewTarget.weekPatternLabel} · ${viewTarget.serviceDayLabel}`
                    : "Not configured"}
                </dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Last Service</dt>
                <dd>{formatDisplayDate(viewTarget.lastServiceDate)}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Next Service</dt>
                <dd>{formatDisplayDate(viewTarget.nextServiceDate)}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Status</dt>
                <dd>{viewTarget.statusLabel}</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/45">Notes</dt>
                <dd>{viewTarget.notes || "—"}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setViewTarget(null)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ebfbff]/20 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
              >
                Close
              </button>
              {!viewTarget.removedAt ? (
                <Link
                  href={`/jobs/bin-management/setup/${viewTarget.siteId}?from=admin`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-2 text-sm font-semibold text-[#ebfbff]"
                >
                  Edit
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
