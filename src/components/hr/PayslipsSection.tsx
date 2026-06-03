"use client";

import { Button } from "@/components/ui/Button";
import { formatDisplayDate, jobLetterStatusClass } from "@/lib/hr-mock-data";
import type { PayslipArchiveDto } from "@/lib/payslip-archive-service";
import type { PayslipRequestDto } from "@/lib/payslip-request-service";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function PayslipsSection() {
  const [requests, setRequests] = useState<PayslipRequestDto[]>([]);
  const [payslips, setPayslips] = useState<PayslipArchiveDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [payPeriod, setPayPeriod] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-requests");
      if (!response.ok) {
        throw new Error("Unable to load payslip requests.");
      }
      const data = (await response.json()) as { requests: PayslipRequestDto[] };
      setRequests(data.requests);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load payslip requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArchive = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const response = await fetch("/api/hr/payslip-archive");
      if (!response.ok) {
        throw new Error("Unable to load payslip archive.");
      }
      const data = (await response.json()) as { payslips: PayslipArchiveDto[] };
      setPayslips(data.payslips);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load payslip archive.",
      );
    } finally {
      setArchiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    void loadArchive();
  }, [loadRequests, loadArchive]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/hr/payslip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payPeriod: payPeriod.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to submit payslip request.");
      }

      setPayPeriod("");
      setNotes("");
      setMessage("Payslip request submitted. Status: Pending.");
      await loadRequests();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit payslip request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <form onSubmit={handleSubmit} className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Request a Payslip Copy</h2>
        <p className="text-sm text-[#ebfbff]/55">
          Request a duplicate or missing payslip for a specific pay period.
        </p>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Pay Period</span>
          <input
            type="text"
            value={payPeriod}
            onChange={(event) => setPayPeriod(event.target.value)}
            placeholder="e.g. March 2026"
            className="mt-2 w-full min-h-[52px] rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            placeholder="Reason for the request"
          />
        </label>

        {message ? (
          <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
            {message}
          </p>
        ) : null}

        <Button
          type="submit"
          fullWidth
          className="min-h-[56px] text-base"
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Submit Payslip Request"}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#ebfbff]">Your Requests</h2>
        {loading ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading payslip requests…
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No payslip requests yet.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">
                    {request.payPeriod}
                  </h3>
                  {request.notes ? (
                    <p className="mt-2 text-sm text-[#ebfbff]/70">{request.notes}</p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${jobLetterStatusClass(request.statusLabel)}`}
                >
                  {request.statusLabel}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Requested {formatDisplayDate(request.createdAt)}
              </p>
            </article>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#ebfbff]">Available Payslips</h2>
        <p className="text-sm text-[#ebfbff]/55">
          Payslip documents assigned to your employee record in Neon.
        </p>
        {archiveLoading ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            Loading payslip archive…
          </div>
        ) : payslips.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No payslips on file yet.
          </div>
        ) : (
          payslips.map((payslip) => (
            <article key={payslip.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#259f00]/20 text-[#6cc801]">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[#ebfbff]">{payslip.payPeriod}</h3>
                  <p className="mt-1 text-sm text-[#ebfbff]/60">
                    Uploaded {formatDisplayDate(payslip.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link
                  href={`/api/hr/payslip-archive/${payslip.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#00c6ff]/40 bg-[#00c6ff]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#00c6ff]/20"
                >
                  Open document
                </Link>
                <a
                  href={`/api/hr/payslip-archive/${payslip.id}`}
                  download={payslip.fileName}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#6cc801]/40 bg-[#6cc801]/10 px-4 py-3 text-sm font-semibold text-[#ebfbff] transition-colors hover:bg-[#6cc801]/20"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download
                </a>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
