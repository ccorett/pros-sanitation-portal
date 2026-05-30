"use client";

import { Button } from "@/components/ui/Button";
import {
  addJobLetterRequest,
  getJobLetterRequests,
} from "@/lib/hr-client-storage";
import {
  formatDisplayDate,
  jobLetterStatusClass,
  type JobLetterRequest,
  type JobLetterType,
} from "@/lib/hr-mock-data";
import { useState } from "react";

const LETTER_TYPES: JobLetterType[] = [
  "Job Letter",
  "Employment Letter",
  "Salary Letter",
];

type JobLettersSectionProps = {
  employeeRecordId: string;
};

export function JobLettersSection({ employeeRecordId }: JobLettersSectionProps) {
  const [requests, setRequests] = useState<JobLetterRequest[]>(() =>
    getJobLetterRequests(employeeRecordId),
  );
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleRequest(letterType: JobLetterType) {
    const updated = addJobLetterRequest(employeeRecordId, letterType, notes.trim() || undefined);
    setRequests(updated);
    setNotes("");
    setMessage(`${letterType} request submitted. Status: Pending.`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="glass-card space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#ebfbff]">Request a Letter</h2>
        <p className="text-sm text-[#ebfbff]/55">
          Select the letter type you need. Human Resources will process mock requests without an
          approval workflow for now.
        </p>

        <label className="block">
          <span className="text-sm text-[#ebfbff]/70">Purpose (optional)</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-[#ebfbff]/15 bg-[#0c151d]/60 px-4 py-3 text-base text-[#ebfbff] placeholder:text-[#ebfbff]/35 focus:border-[#00c6ff]/50 focus:outline-none"
            placeholder="Bank, visa, landlord, etc."
          />
        </label>

        {message ? (
          <p className="rounded-xl border border-[#6cc801]/30 bg-[#6cc801]/10 px-4 py-3 text-sm text-[#6cc801]">
            {message}
          </p>
        ) : null}

        <div className="grid gap-3">
          {LETTER_TYPES.map((letterType) => (
            <Button
              key={letterType}
              type="button"
              fullWidth
              variant="secondary"
              className="min-h-[56px] justify-center text-base"
              onClick={() => handleRequest(letterType)}
            >
              Request {letterType}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#ebfbff]">Request History</h2>
        {requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-[#ebfbff]/55">
            No letter requests yet.
          </div>
        ) : (
          requests.map((request) => (
            <article key={request.id} className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#ebfbff]">
                    {request.letterType}
                  </h3>
                  {request.notes ? (
                    <p className="mt-2 text-sm text-[#ebfbff]/70">{request.notes}</p>
                  ) : null}
                </div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${jobLetterStatusClass(request.status)}`}
                >
                  {request.status}
                </span>
              </div>
              <p className="mt-3 text-xs text-[#ebfbff]/45">
                Requested {formatDisplayDate(request.requestedAt)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
