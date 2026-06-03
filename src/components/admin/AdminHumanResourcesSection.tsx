"use client";

import { EditHistoryModal } from "@/components/admin/EditHistoryModal";
import {
  formatEditTimestamp,
  getAdminHrRecords,
  updateAdminHrStatus,
  type AdminHrRecord,
} from "@/lib/platform-storage";
import { formatDisplayDate } from "@/lib/hr-mock-data";
import type { VacationRequestDto } from "@/lib/vacation-request-service";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { authClient } from "@/lib/auth-client";
import { useCallback, useEffect, useState } from "react";

function statusClass(status: string): string {
  if (status === "Approved") {
    return "border-[#6cc801]/35 bg-[#6cc801]/15 text-[#6cc801]";
  }
  if (status === "Rejected") {
    return "border-[#ff4d4f]/35 bg-[#ff4d4f]/15 text-[#ff4d4f]";
  }
  return "border-[#f5c542]/35 bg-[#f5c542]/15 text-[#f5c542]";
}

// TODO: Restrict approve/reject actions to admin role when RBAC is enabled.
export function AdminHumanResourcesSection() {
  const { data: session } = authClient.useSession();
  const editor =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Admin User";

  const [records, setRecords] = useState<AdminHrRecord[]>(() => getAdminHrRecords());
  const [vacationRequests, setVacationRequests] = useState<VacationRequestDto[]>([]);
  const [vacationLoading, setVacationLoading] = useState(true);
  const [historyTarget, setHistoryTarget] = useState<AdminHrRecord | null>(null);

  const loadVacationRequests = useCallback(async () => {
    setVacationLoading(true);
    try {
      const response = await fetch("/api/hr/vacation-requests");
      if (response.ok) {
        const data = (await response.json()) as { requests: VacationRequestDto[] };
        setVacationRequests(data.requests);
      }
    } finally {
      setVacationLoading(false);
    }
  }, []);

  useEffect(() => {
    function refresh() {
      setRecords(getAdminHrRecords());
    }
    refresh();
    window.addEventListener("pros-platform-data-updated", refresh);
    return () => window.removeEventListener("pros-platform-data-updated", refresh);
  }, []);

  useEffect(() => {
    void loadVacationRequests();
  }, [loadVacationRequests]);

  function handleStatus(id: string, status: "Approved" | "Rejected") {
    setRecords(updateAdminHrStatus(id, status, editor));
  }

  const legacySections = ["Job Letter Requests", "Payslip Requests"] as const;

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#ebfbff]">Vacation Requests</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Live vacation requests from Neon (supervisor → manager workflow).
          </p>
        </div>

        {vacationLoading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            Loading vacation requests…
          </div>
        ) : vacationRequests.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            No vacation requests at this time.
          </div>
        ) : (
          <div className="glass-card overflow-x-auto rounded-2xl">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-4 py-4 font-semibold sm:px-6">Employee</th>
                  <th className="px-4 py-4 font-semibold">Details</th>
                  <th className="px-4 py-4 font-semibold">Date Submitted</th>
                  <th className="px-4 py-4 font-semibold">Supervisor</th>
                  <th className="px-4 py-4 font-semibold">Manager</th>
                  <th className="px-4 py-4 font-semibold sm:px-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {vacationRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {request.employeeName}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatDisplayDate(request.startDate)} –{" "}
                      {formatDisplayDate(request.endDate)} · {request.reason}
                      <span className="mt-1 block text-xs text-[#ebfbff]/45">
                        {request.locationAssignment}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatDisplayDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {request.supervisorStatusLabel}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {request.managerStatusLabel}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${workflowStatusClass(request.finalStatusLabel)}`}
                      >
                        {request.finalStatusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {legacySections.map((sectionTitle) => {
        const rows = records.filter((r) => r.requestType === sectionTitle);
        return (
          <section key={sectionTitle} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#ebfbff]">{sectionTitle}</h2>
              <p className="mt-1 text-sm text-[#ebfbff]/55">
                Review and action employee HR submissions.
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
                No {sectionTitle.toLowerCase()} at this time.
              </div>
            ) : (
              <div className="glass-card overflow-x-auto rounded-2xl">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                      <th className="px-4 py-4 font-semibold sm:px-6">Request Type</th>
                      <th className="px-4 py-4 font-semibold">Employee</th>
                      <th className="px-4 py-4 font-semibold">Details</th>
                      <th className="px-4 py-4 font-semibold">Date Submitted</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-4 py-4 font-semibold">Last Edited</th>
                      <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                      >
                        <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                          {record.requestType}
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">{record.employee}</td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">{record.details}</td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {record.dateSubmitted}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(record.status)}`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#ebfbff]/70">
                          {record.lastEditedAt
                            ? formatEditTimestamp(record.lastEditedAt)
                            : record.lastEdited ?? "—"}
                          {record.editedBy ? (
                            <span className="block text-xs text-[#ebfbff]/45">
                              {record.editedBy}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 sm:px-6">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={record.status !== "Pending"}
                              onClick={() => handleStatus(record.id, "Approved")}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={record.status !== "Pending"}
                              onClick={() => handleStatus(record.id, "Rejected")}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryTarget(record)}
                              className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                            >
                              View History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {historyTarget ? (
        <EditHistoryModal
          recordId={historyTarget.id}
          recordName={`${historyTarget.employee} — ${historyTarget.requestType}`}
          onClose={() => setHistoryTarget(null)}
        />
      ) : null}
    </div>
  );
}
