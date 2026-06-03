import {
  formatJobServiceLogTimestamp,
  jobActionTypeLabel,
} from "@/lib/cleaning-jobs-display";
import type { JobServiceLogDto } from "@/lib/cleaning-jobs-service";

type CleaningJobServiceLogHistoryProps = {
  logs: JobServiceLogDto[];
};

export function CleaningJobServiceLogHistory({
  logs,
}: CleaningJobServiceLogHistoryProps) {
  return (
    <section className="glass-card mt-6 rounded-2xl p-5 sm:p-6">
      <h3 className="text-lg font-bold text-[#ebfbff]">Service Log History</h3>
      <p className="mt-1 text-sm text-[#ebfbff]/50">
        Start, completion, and issue activity saved to Neon.
      </p>

      {logs.length === 0 ? (
        <p className="mt-6 text-sm text-[#ebfbff]/55">No service activity recorded yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {logs.map((log) => (
            <li
              key={log.id}
              className="rounded-xl border border-[#ebfbff]/10 bg-[#ebfbff]/[0.03] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#00c6ff]">
                  {jobActionTypeLabel(log.actionType)}
                </span>
                <span className="text-xs text-[#ebfbff]/45">
                  {formatJobServiceLogTimestamp(log.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#ebfbff]/70">
                {log.employeeName} · {log.employeeEmail}
              </p>
              {log.notes ? (
                <p className="mt-2 text-sm text-[#ebfbff]/60">{log.notes}</p>
              ) : null}
              {log.issueNotes ? (
                <p className="mt-2 text-sm text-[#ff9f0a]">{log.issueNotes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
