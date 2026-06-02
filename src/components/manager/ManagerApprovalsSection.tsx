"use client";

import { Button } from "@/components/ui/Button";
import {
  getVacationWorkflowRecords,
  managerDecideVacationRequest,
} from "@/lib/platform-hr-storage";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { useMemo, useState } from "react";

type ManagerApprovalsSectionProps = {
  managerName: string;
};

export function ManagerApprovalsSection({
  managerName,
}: ManagerApprovalsSectionProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const queue = useMemo(() => {
    void refreshKey;
    return getVacationWorkflowRecords().filter(
      (request) => request.workflowStatus === "Pending Manager Review",
    );
  }, [refreshKey]);

  function handleDecision(
    requestId: string,
    decision: "Approved" | "Rejected",
  ) {
    managerDecideVacationRequest({
      requestId,
      decision,
      editedBy: managerName,
    });
    setMessage(`Request ${decision.toLowerCase()}.`);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-xl border border-[#00c6ff]/30 bg-[#00c6ff]/10 px-4 py-3 text-sm text-[#00c6ff]">
          {message}
        </p>
      ) : null}

      {queue.length === 0 ? (
        <p className="text-sm text-[#ebfbff]/60">
          No requests are waiting for manager approval. After a supervisor marks
          Aware or Unaware, requests appear here.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#ebfbff]/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0c151d]/80 text-xs uppercase tracking-wide text-[#ebfbff]/45">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Request Type</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Supervisor</th>
                <th className="px-4 py-3">Supervisor Status</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-[#ebfbff]/10 text-[#ebfbff]/80"
                >
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#ebfbff]">
                      {request.employeeName}
                    </p>
                    <p className="text-xs text-[#ebfbff]/50">
                      {request.employeeEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4">Vacation Request</td>
                  <td className="px-4 py-4">{request.locationAssignment}</td>
                  <td className="px-4 py-4">{request.supervisorEmail}</td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-[#00c6ff]">
                      {request.supervisorAwareness ?? "—"}
                    </span>
                    {request.supervisorNotes ? (
                      <p className="mt-1 text-xs text-[#ebfbff]/50">
                        {request.supervisorNotes}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    {formatDisplayDate(request.startDate)} –{" "}
                    {formatDisplayDate(request.endDate)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${workflowStatusClass(request.workflowStatus)}`}
                    >
                      {request.workflowStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="login"
                        onClick={() => handleDecision(request.id, "Approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleDecision(request.id, "Rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
