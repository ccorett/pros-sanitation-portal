"use client";

import {
  DesktopTableView,
  MobileCardStack,
  MobileRecordCard,
} from "@/components/ui/MobileRecordCard";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { CleaningLocationAttendanceLogDto } from "@/lib/attendance-log-service";

type CleaningJobAttendanceLogHistoryProps = {
  logs: CleaningLocationAttendanceLogDto[];
};

function formatCheckInTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CleaningJobAttendanceLogHistory({
  logs,
}: CleaningJobAttendanceLogHistoryProps) {
  return (
    <section className="glass-card mt-6 rounded-2xl p-5 sm:p-6">
      <h3 className="text-lg font-bold text-[#ebfbff]">Attendance Log</h3>
      <p className="mt-1 text-sm text-[#ebfbff]/50">
        Last 3 months of attendance for this location.
      </p>

      {logs.length === 0 ? (
        <p className="mt-6 text-sm text-[#ebfbff]/55">
          No attendance recorded for this location in the last 3 months.
        </p>
      ) : (
        <>
          <DesktopTableView className="mt-6">
            <div className="overflow-hidden rounded-xl border border-[#ebfbff]/10">
              <div className="max-h-[320px] overflow-x-auto overflow-y-auto sm:max-h-[420px]">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 border-b border-[#ebfbff]/10 bg-[#0c151d]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Date</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Employee Name
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Status</th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Check-In Time
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">
                        Supervisor
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#ebfbff]/70">Notes</th>
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
                        <td className="px-4 py-3 font-medium text-[#ebfbff]">
                          {log.employeeName}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">{log.statusLabel}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">
                          {formatCheckInTime(log.checkInTime)}
                        </td>
                        <td className="px-4 py-3 text-[#ebfbff]/80">{log.supervisorName}</td>
                        <td className="px-4 py-3 text-[#ebfbff]/70">{log.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DesktopTableView>

          <MobileCardStack className="mt-6">
            {logs.map((log) => (
              <MobileRecordCard
                key={log.id}
                title={log.employeeName}
                subtitle={formatDisplayDate(log.attendanceDate)}
                fields={[
                  { label: "Status", value: log.statusLabel },
                  { label: "Check-In Time", value: formatCheckInTime(log.checkInTime) },
                  { label: "Supervisor", value: log.supervisorName },
                ]}
                detailFields={
                  log.notes?.trim()
                    ? [{ label: "Notes", value: log.notes }]
                    : undefined
                }
              />
            ))}
          </MobileCardStack>
        </>
      )}
    </section>
  );
}
