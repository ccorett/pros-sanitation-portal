"use client";

import type { CleaningJobDto } from "@/lib/cleaning-jobs-service";
import type { CleaningJobStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CleaningJobDetailActionsProps = {
  job: CleaningJobDto;
  canPerformActions: boolean;
};

async function postJobAction(id: string, path: string, body?: Record<string, unknown>) {
  const response = await fetch(`/api/jobs/${id}/${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Unable to update job.");
  }
}

export function CleaningJobDetailActions({
  job,
  canPerformActions,
}: CleaningJobDetailActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueNotes, setIssueNotes] = useState("");

  const canStart = (status: CleaningJobStatus) =>
    status === "PENDING" || status === "ASSIGNED";
  const canComplete = (status: CleaningJobStatus) => status === "IN_PROGRESS";
  const canReportIssue = (status: CleaningJobStatus) => status === "IN_PROGRESS";

  const runAction = async (fn: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await fn();
      setShowIssueForm(false);
      setIssueNotes("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update job.");
    } finally {
      setPending(false);
    }
  };

  if (!canPerformActions) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? (
        <p className="text-sm text-[#ff4d4f]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canStart(job.status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(() => postJobAction(job.id, "start"))}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-5 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20 disabled:opacity-50"
          >
            Start Job
          </button>
        ) : null}
        {canComplete(job.status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void runAction(() => postJobAction(job.id, "complete"))}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#259f00]/40 bg-[#259f00]/10 px-5 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#259f00]/20 disabled:opacity-50"
          >
            Complete Job
          </button>
        ) : null}
        {canReportIssue(job.status) ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowIssueForm((value) => !value)}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#ff9f0a]/40 bg-[#ff9f0a]/10 px-5 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#ff9f0a]/20 disabled:opacity-50"
          >
            Report Issue
          </button>
        ) : null}
      </div>

      {showIssueForm ? (
        <form
          className="space-y-3 rounded-xl border border-[#ff9f0a]/30 bg-[#ff9f0a]/5 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(() =>
              postJobAction(job.id, "issue", { issueNotes: issueNotes.trim() }),
            );
          }}
        >
          <label className="block text-sm font-medium text-[#ebfbff]">
            Issue details
            <textarea
              required
              value={issueNotes}
              onChange={(event) => setIssueNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff]"
              placeholder="Describe the issue encountered on site."
            />
          </label>
          <button
            type="submit"
            disabled={pending || !issueNotes.trim()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff9f0a]/40 bg-[#ff9f0a]/15 px-4 py-2 text-sm font-semibold text-[#ebfbff] disabled:opacity-50"
          >
            Submit Issue
          </button>
        </form>
      ) : null}
    </div>
  );
}
