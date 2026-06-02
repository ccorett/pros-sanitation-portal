"use client";

import { Button } from "@/components/ui/Button";
import {
  getVacationWorkflowRecords,
  markSupervisorVacationAwareness,
} from "@/lib/platform-hr-storage";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import {
  canSupervisorReviewRequest,
  workflowStatusClass,
  type SupervisorAwarenessStatus,
} from "@/lib/vacation-workflow";
import type { Employee } from "@prisma/client";
import { useMemo, useState } from "react";

type SupervisorVacationReviewSectionProps = {
  supervisor: Pick<
    Employee,
    | "accessLevel"
    | "operationalGroup"
    | "locationAssignment"
    | "companyEmail"
    | "firstName"
    | "lastName"
  >;
};

export function SupervisorVacationReviewSection({
  supervisor,
}: SupervisorVacationReviewSectionProps) {
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const pendingRequests = useMemo(() => {
    void refreshKey;
    return getVacationWorkflowRecords().filter((request) =>
      canSupervisorReviewRequest(supervisor, request),
    );
  }, [supervisor, refreshKey]);

  function handleAwareness(
    requestId: string,
    awareness: SupervisorAwarenessStatus,
  ) {
    setMessage(null);
    const notes = notesById[requestId]?.trim() ?? "";

    markSupervisorVacationAwareness({
      requestId,
      awareness,
      supervisorNotes: notes,
      editedBy: `${supervisor.firstName} ${supervisor.lastName}`,
    });

    setMessage(
      `Marked ${awareness}. Request sent to manager for final approval.`,
    );
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
          {message}
        </p>
      ) : null}

      {pendingRequests.length === 0 ? (
        <p className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/60">
          No vacation requests are waiting for your Aware/Unaware review.
        </p>
      ) : (
        pendingRequests.map((request) => (
          <article
            key={request.id}
            className="glass-card space-y-4 rounded-2xl p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#ebfbff]">
                  {request.employeeName}
                </h3>
                <p className="mt-1 text-sm text-[#ebfbff]/55">
                  {request.employeeEmail}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workflowStatusClass(request.workflowStatus)}`}
              >
                {request.workflowStatus}
              </span>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#ebfbff]/50">Request Type</dt>
                <dd className="font-medium text-[#ebfbff]">Vacation Request</dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/50">Location Assignment</dt>
                <dd className="font-medium text-[#ebfbff]">
                  {request.locationAssignment}
                </dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/50">Dates</dt>
                <dd className="font-medium text-[#ebfbff]">
                  {formatDisplayDate(request.startDate)} –{" "}
                  {formatDisplayDate(request.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[#ebfbff]/50">Reason</dt>
                <dd className="font-medium text-[#ebfbff]">{request.reason}</dd>
              </div>
            </dl>

            <label className="block">
              <span className="text-sm text-[#ebfbff]/70">Supervisor Notes</span>
              <textarea
                value={notesById[request.id] ?? ""}
                onChange={(event) =>
                  setNotesById((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Optional notes for the manager review queue"
                className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-sm text-[#ebfbff] focus:border-[#00c6ff]/50 focus:outline-none"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="login"
                onClick={() => handleAwareness(request.id, "Aware")}
              >
                Aware
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAwareness(request.id, "Unaware")}
              >
                Unaware
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
