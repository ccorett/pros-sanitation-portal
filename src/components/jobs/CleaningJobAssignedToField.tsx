"use client";

import { Button } from "@/components/ui/Button";
import type { CleaningJobAssigneeDto } from "@/lib/cleaning-jobs-service";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CleaningJobAssignedToFieldProps = {
  jobId: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedByName: string;
  canEdit: boolean;
};

export function CleaningJobAssignedToField({
  jobId,
  assignedEmployeeId,
  assignedEmployeeName,
  assignedByName,
  canEdit,
}: CleaningJobAssignedToFieldProps) {
  const router = useRouter();
  const [assignees, setAssignees] = useState<CleaningJobAssigneeDto[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(assignedEmployeeId ?? "");
  const [loading, setLoading] = useState(canEdit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssignees = useCallback(async () => {
    if (!canEdit) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/assignees`);
      const data = (await response.json()) as {
        assignees?: CleaningJobAssigneeDto[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load assignees.");
      }

      setAssignees(data.assignees ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load assignees.");
    } finally {
      setLoading(false);
    }
  }, [canEdit, jobId]);

  useEffect(() => {
    void loadAssignees();
  }, [loadAssignees]);

  useEffect(() => {
    setSelectedEmployeeId(assignedEmployeeId ?? "");
  }, [assignedEmployeeId]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedEmployeeId: selectedEmployeeId || null,
          assignedBy: assignedByName,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update assignment.");
      }

      setMessage("Assigned To updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update assignment.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <dd className="mt-1 text-sm text-[#ebfbff]">
        {assignedEmployeeName ?? "Unassigned"}
      </dd>
    );
  }

  return (
    <div className="mt-1 space-y-3">
      {loading ? (
        <p className="text-sm text-[#ebfbff]/55">Loading assignees…</p>
      ) : (
        <select
          value={selectedEmployeeId}
          onChange={(event) => setSelectedEmployeeId(event.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-2 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
        >
          <option value="">Unassigned</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.fullName}
            </option>
          ))}
        </select>
      )}

      <Button
        type="button"
        variant="secondary"
        className="min-h-[40px] px-4 text-sm"
        disabled={saving || loading}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save Assignment"}
      </Button>

      {message ? <p className="text-xs text-[#6cc801]">{message}</p> : null}
      {error ? <p className="text-xs text-[#ff4d4f]">{error}</p> : null}
    </div>
  );
}
