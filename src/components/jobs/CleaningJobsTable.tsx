"use client";

import {
  cleaningJobPriorityBadgeClass,
  cleaningJobPriorityLabel,
  cleaningJobStatusBadgeClass,
  cleaningJobStatusLabel,
  formatCleaningJobDate,
} from "@/lib/cleaning-jobs-display";
import type { CleaningJobDto } from "@/lib/cleaning-jobs-service";
import type { CleaningJobStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CleaningJobsTableProps = {
  jobs: CleaningJobDto[];
  canPerformActions: boolean;
};

async function postJobAction(id: string, path: "start" | "complete") {
  const response = await fetch(`/api/jobs/${id}/${path}`, { method: "POST" });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to update job.");
  }
}

export function CleaningJobsTable({
  jobs,
  canPerformActions,
}: CleaningJobsTableProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (jobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
        No cleaning jobs are assigned to your account.
      </div>
    );
  }

  const handleAction = async (id: string, action: "start" | "complete") => {
    setPendingId(id);
    setError(null);
    try {
      await postJobAction(id, action);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update job.");
    } finally {
      setPendingId(null);
    }
  };

  const canStart = (status: CleaningJobStatus) =>
    status === "PENDING" || status === "ASSIGNED";

  const canComplete = (status: CleaningJobStatus) => status === "IN_PROGRESS";

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-[#ff4d4f]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="glass-card portal-table-scroll rounded-2xl">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Job Title</th>
              <th className="px-4 py-4 font-semibold">Location</th>
              <th className="px-4 py-4 font-semibold">Assigned To</th>
              <th className="px-4 py-4 font-semibold">Scheduled Date</th>
              <th className="px-4 py-4 font-semibold">Priority</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                  {job.title}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{job.clientLocation}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {job.assignedEmployeeName ?? "Unassigned"}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatCleaningJobDate(job.scheduledDate)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cleaningJobPriorityBadgeClass(job.priority)}`}
                  >
                    {cleaningJobPriorityLabel(job.priority)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${cleaningJobStatusBadgeClass(job.status)}`}
                  >
                    {cleaningJobStatusLabel(job.status)}
                  </span>
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
                    >
                      View Job
                    </Link>
                    {canPerformActions && canStart(job.status) ? (
                      <button
                        type="button"
                        disabled={pendingId === job.id}
                        onClick={() => void handleAction(job.id, "start")}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20 disabled:opacity-50"
                      >
                        Start Job
                      </button>
                    ) : null}
                    {canPerformActions && canComplete(job.status) ? (
                      <button
                        type="button"
                        disabled={pendingId === job.id}
                        onClick={() => void handleAction(job.id, "complete")}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#259f00]/40 bg-[#259f00]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] transition-colors hover:bg-[#259f00]/20 disabled:opacity-50"
                      >
                        Complete Job
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
