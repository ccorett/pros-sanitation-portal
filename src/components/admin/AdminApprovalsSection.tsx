"use client";

import {
  getApprovalRequests,
  updateApprovalStatus,
} from "@/lib/admin-client-storage";
import {
  approvalPriorityClass,
  approvalStatusClass,
  formatAdminDate,
  type ApprovalRequest,
} from "@/lib/admin-mock-data";
import { useState } from "react";

export function AdminApprovalsSection() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(() =>
    getApprovalRequests(),
  );
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);

  function handleStatus(id: string, status: "Approved" | "Rejected") {
    setRequests(updateApprovalStatus(id, status));
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#ebfbff]">Requests for Approval</h2>
        <p className="mt-1 text-sm text-[#ebfbff]/55">
          All pending operational requests in one queue.
        </p>
      </div>

      <div className="glass-card overflow-x-auto rounded-2xl">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
              <th className="px-4 py-4 font-semibold sm:px-6">Request Type</th>
              <th className="px-4 py-4 font-semibold">Requested By</th>
              <th className="px-4 py-4 font-semibold">Details</th>
              <th className="px-4 py-4 font-semibold">Date Submitted</th>
              <th className="px-4 py-4 font-semibold">Priority</th>
              <th className="px-4 py-4 font-semibold">Status</th>
              <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request.id}
                className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
              >
                <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                  {request.requestType}
                </td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{request.requestedBy}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">{request.details}</td>
                <td className="px-4 py-4 text-[#ebfbff]/70">
                  {formatAdminDate(request.dateSubmitted)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${approvalPriorityClass(request.priority)}`}
                  >
                    {request.priority}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${approvalStatusClass(request.status)}`}
                  >
                    {request.status}
                  </span>
                </td>
                <td className="px-4 py-4 sm:px-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={request.status !== "Pending"}
                      onClick={() => handleStatus(request.id, "Approved")}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={request.status !== "Pending"}
                      onClick={() => handleStatus(request.id, "Rejected")}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(request)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff]"
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0c151d]/80 p-4 backdrop-blur-sm sm:items-center">
          <div className="glass-card w-full max-w-lg rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-bold text-[#ebfbff]">{selected.requestType}</h3>
            <p className="mt-2 text-sm text-[#ebfbff]/70">{selected.details}</p>
            <p className="mt-4 text-sm text-[#ebfbff]/55">
              Requested by {selected.requestedBy} on{" "}
              {formatAdminDate(selected.dateSubmitted)}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff]"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
