"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type {
  AttendanceLogDto,
  AttendanceTeamMemberDto,
} from "@/lib/attendance-log-service";
import { AttendanceStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type TeamCheckInSectionProps = {
  isManager: boolean;
};

type AttendanceEntryState = {
  status: AttendanceStatus;
  notes: string;
};

const STATUS_OPTIONS: Array<{ value: AttendanceStatus; label: string }> = [
  { value: AttendanceStatus.PRESENT, label: "Present" },
  { value: AttendanceStatus.ABSENT, label: "Absent" },
  { value: AttendanceStatus.LATE, label: "Late" },
  { value: AttendanceStatus.SICK, label: "Sick" },
  { value: AttendanceStatus.VACATION, label: "Vacation" },
];

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCheckInTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TeamCheckInSection({ isManager }: TeamCheckInSectionProps) {
  const [activeTab, setActiveTab] = useState<"check-in" | "log">("check-in");
  const [attendanceDate, setAttendanceDate] = useState(todayInputValue());
  const [selectedLocation, setSelectedLocation] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [teamLocation, setTeamLocation] = useState("");
  const [members, setMembers] = useState<AttendanceTeamMemberDto[]>([]);
  const [entries, setEntries] = useState<Record<string, AttendanceEntryState>>({});
  const [logs, setLogs] = useState<AttendanceLogDto[]>([]);
  const [logLocationFilter, setLogLocationFilter] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setLoadingTeam(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (isManager && selectedLocation) {
        params.set("location", selectedLocation);
      }

      const response = await fetch(
        `/api/jobs/team-check-in/team${params.size ? `?${params.toString()}` : ""}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        error?: string;
        team?: { location: string; members: AttendanceTeamMemberDto[] };
        locations?: string[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load team members.");
      }

      const nextMembers = data.team?.members ?? [];
      setTeamLocation(data.team?.location ?? "");
      setMembers(nextMembers);
      setLocations(data.locations ?? []);

      if (isManager && !selectedLocation && data.team?.location) {
        setSelectedLocation(data.team.location);
      }

      setEntries((current) => {
        const next: Record<string, AttendanceEntryState> = {};
        for (const member of nextMembers) {
          next[member.id] = current[member.id] ?? {
            status: AttendanceStatus.PRESENT,
            notes: "",
          };
        }
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load team members.");
      setMembers([]);
    } finally {
      setLoadingTeam(false);
    }
  }, [isManager, selectedLocation]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);

    try {
      const params = new URLSearchParams();
      if (isManager && logLocationFilter) {
        params.set("location", logLocationFilter);
      }

      const response = await fetch(
        `/api/jobs/team-check-in/attendance${params.size ? `?${params.toString()}` : ""}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        error?: string;
        logs?: AttendanceLogDto[];
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load attendance logs.");
      }

      setLogs(data.logs ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load attendance logs.");
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  }, [isManager, logLocationFilter]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    if (activeTab === "log") {
      void loadLogs();
    }
  }, [activeTab, loadLogs]);

  const submittedCount = useMemo(
    () => Object.values(entries).filter((entry) => entry.status).length,
    [entries],
  );

  function updateEntry(employeeId: string, patch: Partial<AttendanceEntryState>) {
    setEntries((current) => ({
      ...current,
      [employeeId]: {
        ...current[employeeId],
        ...patch,
      },
    }));
  }

  async function handleSubmitAttendance(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payloadEntries = members.map((member) => ({
        employeeId: member.id,
        status: entries[member.id]?.status ?? AttendanceStatus.PRESENT,
        notes: entries[member.id]?.notes?.trim() || undefined,
      }));

      const response = await fetch("/api/jobs/team-check-in/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceDate,
          location: isManager ? selectedLocation || teamLocation : undefined,
          entries: payloadEntries,
        }),
      });

      const data = (await response.json()) as { error?: string; saved?: number };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit attendance.");
      }

      setMessage(`Attendance saved for ${data.saved ?? 0} employees.`);
      if (activeTab === "log") {
        await loadLogs();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditLog(log: AttendanceLogDto, status: AttendanceStatus) {
    setEditingId(log.id);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/team-check-in/attendance/${log.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update attendance record.");
      }

      setMessage("Attendance record updated.");
      await loadLogs();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update attendance record.",
      );
    } finally {
      setEditingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("check-in")}
          className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "check-in"
              ? "border border-[#00c6ff]/40 bg-[#00c6ff]/15 text-[#ebfbff]"
              : "border border-[#ebfbff]/10 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:text-[#ebfbff]"
          }`}
        >
          Team Check-In
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("log")}
          className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "log"
              ? "border border-[#00c6ff]/40 bg-[#00c6ff]/15 text-[#ebfbff]"
              : "border border-[#ebfbff]/10 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:text-[#ebfbff]"
          }`}
        >
          Attendance Log
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-4 py-3 text-sm text-[#ff4d4f]">
          {error}
        </p>
      ) : null}

      {activeTab === "check-in" ? (
        <form onSubmit={handleSubmitAttendance} className="space-y-6">
          <div className="glass-card rounded-2xl p-5 sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">Attendance Date</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
                  required
                />
              </label>

              <div>
                <span className="text-sm text-[#ebfbff]/70">Location</span>
                {isManager ? (
                  <select
                    value={selectedLocation}
                    onChange={(event) => setSelectedLocation(event.target.value)}
                    className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="mt-2 min-h-[48px] rounded-xl border border-[#ebfbff]/10 bg-[#0c151d]/40 px-4 py-3 text-sm font-medium text-[#ebfbff]">
                    {teamLocation || "Loading location…"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {loadingTeam ? (
            <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
              Loading assigned team members…
            </div>
          ) : members.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
              No employees are assigned to this location.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="glass-card rounded-2xl p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#ebfbff]">
                        {member.fullName}
                      </h3>
                      <p className="mt-1 text-xs text-[#ebfbff]/55">
                        {member.employeePublicId}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((option) => {
                        const selected =
                          entries[member.id]?.status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateEntry(member.id, { status: option.value })
                            }
                            className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                              selected
                                ? "border-[#00c6ff]/40 bg-[#00c6ff]/15 text-[#ebfbff]"
                                : "border-[#ebfbff]/10 bg-[#0c151d]/40 text-[#ebfbff]/70 hover:text-[#ebfbff]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs text-[#ebfbff]/55">Notes (optional)</span>
                    <input
                      type="text"
                      value={entries[member.id]?.notes ?? ""}
                      onChange={(event) =>
                        updateEntry(member.id, { notes: event.target.value })
                      }
                      className="mt-2 w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
                      placeholder="Optional note"
                    />
                  </label>
                </article>
              ))}
            </div>
          )}

          <Button
            type="submit"
            className="min-h-[52px] w-full sm:w-auto"
            disabled={submitting || members.length === 0}
          >
            {submitting ? "Submitting…" : `Submit Attendance (${submittedCount})`}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          {isManager ? (
            <div className="glass-card rounded-2xl p-4 sm:p-5">
              <label className="block">
                <span className="text-sm text-[#ebfbff]/70">Filter by location</span>
                <select
                  value={logLocationFilter}
                  onChange={(event) => setLogLocationFilter(event.target.value)}
                  className="mt-2 w-full min-h-[48px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none sm:max-w-md"
                >
                  <option value="">All locations</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {loadingLogs ? (
            <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
              Loading attendance log…
            </div>
          ) : logs.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
              No attendance records yet.
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-2xl">
              <div className="max-h-[320px] overflow-x-auto overflow-y-auto sm:max-h-[500px] lg:max-h-[560px]">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Date</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Location
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Employee
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Check-In Time
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Supervisor
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-[#ebfbff]/10 last:border-0"
                      >
                        <td className="px-4 py-3 text-[#ebfbff]/80">
                          {formatDisplayDate(log.attendanceDate)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">{log.location}</td>
                        <td className="px-4 py-3 font-medium text-[#ebfbff]">
                          {log.employeeName}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">{log.statusLabel}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">
                          {formatCheckInTime(log.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">
                          {log.supervisorName}
                        </td>
                        <td className="px-4 py-3">
                          {log.canEdit ? (
                            <select
                              value={log.status}
                              disabled={editingId === log.id}
                              onChange={(event) =>
                                void handleEditLog(
                                  log,
                                  event.target.value as AttendanceStatus,
                                )
                              }
                              className="min-h-[36px] rounded-lg border border-[#ebfbff]/15 bg-[#0c151d]/60 px-2 py-1 text-xs text-[#ebfbff]"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-[#ebfbff]/45">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
