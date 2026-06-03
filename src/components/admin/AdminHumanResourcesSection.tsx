"use client";

import {
  formatDisplayDate,
  jobLetterStatusClass,
} from "@/lib/hr-mock-data";
import type { JobLetterRequestDto } from "@/lib/job-letter-request-service";
import type { PayslipRequestDto } from "@/lib/payslip-request-service";
import {
  inboxRecordElementId,
  readInboxFocusParams,
  scrollToInboxRecord,
} from "@/lib/inbox-focus";
import type { VacationRequestDto } from "@/lib/vacation-request-service";
import { workflowStatusClass } from "@/lib/vacation-workflow";
import { useCallback, useEffect, useState } from "react";

// TODO: Restrict approve/reject actions to admin role when RBAC is enabled.
export function AdminHumanResourcesSection() {
  const [vacationRequests, setVacationRequests] = useState<VacationRequestDto[]>([]);
  const [jobLetterRequests, setJobLetterRequests] = useState<JobLetterRequestDto[]>([]);
  const [payslipRequests, setPayslipRequests] = useState<PayslipRequestDto[]>([]);
  const [vacationLoading, setVacationLoading] = useState(true);
  const [jobLetterLoading, setJobLetterLoading] = useState(true);
  const [payslipLoading, setPayslipLoading] = useState(true);
  const [actingJobLetterId, setActingJobLetterId] = useState<string | null>(null);
  const [actingPayslipId, setActingPayslipId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const loadJobLetterRequests = useCallback(async () => {
    setJobLetterLoading(true);
    try {
      const response = await fetch("/api/hr/job-letter-requests");
      if (response.ok) {
        const data = (await response.json()) as { requests: JobLetterRequestDto[] };
        setJobLetterRequests(data.requests);
      }
    } finally {
      setJobLetterLoading(false);
    }
  }, []);

  const loadPayslipRequests = useCallback(async () => {
    setPayslipLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-requests");
      if (response.ok) {
        const data = (await response.json()) as { requests: PayslipRequestDto[] };
        setPayslipRequests(data.requests);
      }
    } finally {
      setPayslipLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVacationRequests();
    void loadJobLetterRequests();
    void loadPayslipRequests();
  }, [loadVacationRequests, loadJobLetterRequests, loadPayslipRequests]);

  useEffect(() => {
    const { focus, requestId } = readInboxFocusParams();
    if (!focus || !requestId) return;
    if (focus === "job-letter" || focus === "payslip" || focus === "vacation") {
      scrollToInboxRecord(focus, requestId);
    }
  }, [vacationRequests, jobLetterRequests, payslipRequests]);

  async function handleJobLetterReview(
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    setMessage(null);
    setActingJobLetterId(requestId);

    try {
      const response = await fetch(`/api/hr/job-letter-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update job letter request.");
      }

      setMessage(
        `Job letter request ${status === "APPROVED" ? "approved" : "rejected"}.`,
      );
      await loadJobLetterRequests();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update job letter request.",
      );
    } finally {
      setActingJobLetterId(null);
    }
  }

  async function handlePayslipReview(
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    setMessage(null);
    setActingPayslipId(requestId);

    try {
      const response = await fetch(`/api/hr/payslip-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update payslip request.");
      }

      setMessage(
        `Payslip request ${status === "APPROVED" ? "approved" : "rejected"}.`,
      );
      await loadPayslipRequests();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update payslip request.",
      );
    } finally {
      setActingPayslipId(null);
    }
  }

  return (
    <div className="space-y-10">
      {message ? (
        <p className="rounded-xl border border-[#00c6ff]/30 bg-[#00c6ff]/10 px-4 py-3 text-sm text-[#00c6ff]">
          {message}
        </p>
      ) : null}

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
          <div className="glass-card portal-table-scroll rounded-2xl">
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
                    id={inboxRecordElementId("vacation", request.id)}
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

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#ebfbff]">Job Letter Requests</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Review and approve or reject employee letter requests.
          </p>
        </div>

        {jobLetterLoading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            Loading job letter requests…
          </div>
        ) : jobLetterRequests.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            No job letter requests at this time.
          </div>
        ) : (
          <div className="glass-card portal-table-scroll rounded-2xl">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-4 py-4 font-semibold sm:px-6">Employee</th>
                  <th className="px-4 py-4 font-semibold">Letter Type</th>
                  <th className="px-4 py-4 font-semibold">Details</th>
                  <th className="px-4 py-4 font-semibold">Date Submitted</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobLetterRequests.map((request) => (
                  <tr
                    key={request.id}
                    id={inboxRecordElementId("job-letter", request.id)}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {request.employeeName}
                      <span className="mt-1 block text-xs font-normal text-[#ebfbff]/45">
                        {request.employeeEmail}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {request.letterTypeLabel}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {request.notes ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatDisplayDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${jobLetterStatusClass(request.statusLabel)}`}
                      >
                        {request.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            request.statusLabel !== "Pending" ||
                            actingJobLetterId === request.id
                          }
                          onClick={() =>
                            void handleJobLetterReview(request.id, "APPROVED")
                          }
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={
                            request.statusLabel !== "Pending" ||
                            actingJobLetterId === request.id
                          }
                          onClick={() =>
                            void handleJobLetterReview(request.id, "REJECTED")
                          }
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                        >
                          Reject
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

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#ebfbff]">Payslip Requests</h2>
          <p className="mt-1 text-sm text-[#ebfbff]/55">
            Review and approve or reject employee payslip copy requests.
          </p>
        </div>

        {payslipLoading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            Loading payslip requests…
          </div>
        ) : payslipRequests.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-[#ebfbff]/55">
            No payslip requests at this time.
          </div>
        ) : (
          <div className="glass-card portal-table-scroll rounded-2xl">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#ebfbff]/10 text-xs uppercase tracking-wide text-[#ebfbff]/50">
                  <th className="px-4 py-4 font-semibold sm:px-6">Employee</th>
                  <th className="px-4 py-4 font-semibold">Pay Period</th>
                  <th className="px-4 py-4 font-semibold">Notes</th>
                  <th className="px-4 py-4 font-semibold">Date Submitted</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {payslipRequests.map((request) => (
                  <tr
                    key={request.id}
                    id={inboxRecordElementId("payslip", request.id)}
                    className="border-b border-[#ebfbff]/5 last:border-b-0 hover:bg-[#ebfbff]/[0.03]"
                  >
                    <td className="px-4 py-4 font-medium text-[#ebfbff] sm:px-6">
                      {request.employeeName}
                      <span className="mt-1 block text-xs font-normal text-[#ebfbff]/45">
                        {request.employeeEmail}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">{request.payPeriod}</td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {request.notes ?? "—"}
                    </td>
                    <td className="px-4 py-4 text-[#ebfbff]/70">
                      {formatDisplayDate(request.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${jobLetterStatusClass(request.statusLabel)}`}
                      >
                        {request.statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={
                            request.statusLabel !== "Pending" ||
                            actingPayslipId === request.id
                          }
                          onClick={() =>
                            void handlePayslipReview(request.id, "APPROVED")
                          }
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={
                            request.statusLabel !== "Pending" ||
                            actingPayslipId === request.id
                          }
                          onClick={() =>
                            void handlePayslipReview(request.id, "REJECTED")
                          }
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[#ff4d4f]/40 bg-[#ff4d4f]/10 px-3 py-2 text-xs font-semibold text-[#ebfbff] disabled:opacity-40"
                        >
                          Reject
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
    </div>
  );
}
